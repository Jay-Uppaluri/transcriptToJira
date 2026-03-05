const { ManagedIdentityCredential } = require("@azure/identity");
const { App } = require("@microsoft/teams.apps");
const { ChatPrompt } = require("@microsoft/teams.ai");
const { LocalStorage } = require("@microsoft/teams.common");
const { OpenAIChatModel } = require("@microsoft/teams.openai");
const { MessageActivity } = require('@microsoft/teams.api');
const fs = require('fs');
const path = require('path');
const config = require("../config");

// Services
const { getMeetingTranscript } = require('../services/graphService');
const { generatePRD } = require('../services/prdService');
const { generateTickets, submitToJira } = require('../services/ticketService');
const {
  buildPRDCard,
  buildTicketsCard,
  buildJiraResultCard,
  buildProgressCard,
  buildErrorCard,
} = require('../services/adaptiveCards');

// Helper: create a MessageActivity with an Adaptive Card attachment
function cardMessage(card) {
  return new MessageActivity('').addAttachments(card);
}

// Create storage for conversation history
const storage = new LocalStorage();

// Load instructions from file on initialization
function loadInstructions() {
  const instructionsFilePath = path.join(__dirname, "instructions.txt");
  return fs.readFileSync(instructionsFilePath, 'utf-8').trim();
}

// Load instructions once at startup
const instructions = loadInstructions();

const createTokenFactory = () => {
  return async (scope, tenantId) => {
    const managedIdentityCredential = new ManagedIdentityCredential({
        clientId: process.env.CLIENT_ID
      });
    const scopes = Array.isArray(scope) ? scope : [scope];
    const tokenResponse = await managedIdentityCredential.getToken(scopes, {
      tenantId: tenantId
    });

    return tokenResponse.token;
  };
};

// Configure authentication using TokenCredentials
const tokenCredentials = {
  clientId: process.env.CLIENT_ID || '',
  token: createTokenFactory()
};

const credentialOptions = config.MicrosoftAppType === "UserAssignedMsi" ? { ...tokenCredentials } : undefined;

// Create the app with storage
const app = new App({
  ...credentialOptions,
  storage
});

// Handle incoming messages (including Adaptive Card Action.Submit)
app.on('message', async ({ send, stream, activity }) => {
  // Handle Adaptive Card Action.Submit (activity.value is set, no text)
  if (activity.value && activity.value.action) {
    const data = activity.value;
    console.log('[card.submit] Action received:', data.action);

    if (data.action === 'generateTickets') {
      try {
        const prd = storage.get(data.prdId);
        if (!prd) {
          await send(cardMessage(buildErrorCard('PRD data has expired. Please run /prd-from-text again.')));
          return;
        }

        await send(cardMessage(buildProgressCard('Generating Jira tickets from PRD... This may take 20-30 seconds.')));

        const projectKey = data.projectKey || config.jiraProjectKey;
        const { tickets } = await generateTickets(prd, projectKey);

        const ticketsId = `tickets_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        storage.set(ticketsId, tickets);

        const ticketsCard = buildTicketsCard(tickets, projectKey, ticketsId);
        await send(cardMessage(ticketsCard));
      } catch (error) {
        console.error('Ticket generation error:', error);
        await send(cardMessage(buildErrorCard(error.message || 'Failed to generate tickets.')));
      }
      return;
    }

    if (data.action === 'submitToJira') {
      try {
        const tickets = storage.get(data.ticketsId);
        if (!tickets) {
          await send(cardMessage(buildErrorCard('Ticket data has expired. Please regenerate tickets.')));
          return;
        }

        await send(cardMessage(buildProgressCard('Submitting tickets to Jira...')));

        const results = await submitToJira(tickets);
        const resultCard = buildJiraResultCard(results);
        await send(cardMessage(resultCard));
      } catch (error) {
        console.error('Jira submission error:', error);
        await send(cardMessage(buildErrorCard(error.message || 'Failed to submit to Jira.')));
      }
      return;
    }

    console.log('[card.submit] Unknown action:', data.action);
    return;
  }

  const text = (activity.text || '').trim();

  // Remove bot mention prefix if present (in group chats, Teams prepends "<at>BotName</at>")
  const cleanText = text.replace(/<at[^>]*>.*?<\/at>\s*/gi, '').trim();

  // Command: /prd-from-text <pasted transcript>
  if (cleanText.startsWith('/prd-from-text')) {
    const transcript = cleanText.replace('/prd-from-text', '').trim();
    if (!transcript) {
      await send(new MessageActivity('Usage: /prd-from-text <paste your meeting transcript here>\n\nPaste the full meeting transcript text after the command.'));
      return;
    }

    try {
      await send(cardMessage(buildProgressCard('Generating PRD from transcript...')));

      const { prd } = await generatePRD(transcript);

      const prdId = `prd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      storage.set(prdId, prd);

      const prdCard = buildPRDCard(prd, 'Manual Transcript', prdId);
      await send(cardMessage(prdCard));
    } catch (error) {
      console.error('PRD generation error:', error);
      await send(cardMessage(buildErrorCard(error.message || 'Failed to generate PRD.')));
    }
    return;
  }

  // Command: /generate-prd <meeting-join-url>
  if (cleanText.startsWith('/generate-prd')) {
    const joinUrl = cleanText.replace('/generate-prd', '').trim();
    if (!joinUrl) {
      await send(new MessageActivity('Usage: /generate-prd <teams-meeting-join-url>\n\nPaste the meeting join URL to fetch the transcript and generate a PRD.'));
      return;
    }

    try {
      await send(cardMessage(buildProgressCard('Fetching meeting transcript...')));

      const { transcript, meetingSubject } = await getMeetingTranscript(joinUrl);

      await send(cardMessage(buildProgressCard('Generating PRD from transcript...')));

      const { prd } = await generatePRD(transcript);

      const prdId = `prd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      storage.set(prdId, prd);

      const prdCard = buildPRDCard(prd, meetingSubject, prdId);
      await send(cardMessage(prdCard));
    } catch (error) {
      console.error('PRD generation error:', error);
      await send(cardMessage(buildErrorCard(error.message || 'Failed to generate PRD.')));
    }
    return;
  }

  // Default: AI chat (existing behavior)
  const conversationKey = `${activity.conversation.id}/${activity.from.id}`;
  const messages = storage.get(conversationKey) || [];

  try {
    const prompt = new ChatPrompt({
      messages,
      instructions,
      model: new OpenAIChatModel({
        model: config.openAIModelName,
        apiKey: config.openAIKey
      })
    });

    if (activity.conversation.isGroup) {
      const response = await prompt.send(activity.text);
      const responseActivity = new MessageActivity(response.content).addAiGenerated().addFeedback();
      await send(responseActivity);
    } else {
        await prompt.send(activity.text, {
          onChunk: (chunk) => {
            stream.emit(chunk);
          },
        });
      stream.emit(new MessageActivity().addAiGenerated().addFeedback());
    }
    storage.set(conversationKey, messages);
  } catch (error) {
    console.error(error);
    await send("The agent encountered an error or bug.");
    await send("To continue to run this agent, please fix the agent source code.");
  }
});

app.on('message.submit.feedback', async ({ activity }) => {
  //add custom feedback process logic here
  console.log("Your feedback is " + JSON.stringify(activity.value));
});

module.exports = app;