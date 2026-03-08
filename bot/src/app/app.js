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
const { generatePRD, generateSummary, editPRD } = require('../services/prdService');
const { generateTickets, submitToJira } = require('../services/ticketService');
const {
  buildPRDCard,
  buildSummaryCard,
  buildTicketDraftsCard,
  buildEditTicketMenuCard,
  buildEditTicketCard,
  buildJiraResultCard,
  buildProgressCard,
  buildErrorCard,
  buildWelcomeCard,
  buildHelpCard,
  buildValidationCard,
  plainTextToAdf,
} = require('../services/adaptiveCards');

// ─── Deduplication ───
// Teams retries messages AND card submits when responses take too long.
// Track both activity IDs and action hashes to skip duplicates.
const processedActivities = new Map(); // key -> timestamp
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEDUP_CLEANUP_INTERVAL = 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - DEDUP_TTL_MS;
  for (const [id, ts] of processedActivities) {
    if (ts < cutoff) processedActivities.delete(id);
  }
}, DEDUP_CLEANUP_INTERVAL).unref();

function isDuplicate(activityId) {
  if (!activityId) return false;
  if (processedActivities.has(activityId)) return true;
  processedActivities.set(activityId, Date.now());
  return false;
}

// For card submits: dedup based on action + key data (prdId, ticketsId, etc.)
function isActionDuplicate(data) {
  if (!data?.action) return false;
  const key = `action:${data.action}:${data.prdId || data.ticketsId || data.transcriptId || data.urlId || data.dataId || ''}`;
  if (processedActivities.has(key)) return true;
  processedActivities.set(key, Date.now());
  return false;
}

// ─── Helpers ───

function cardMessage(card) {
  return new MessageActivity('').addAttachments(card);
}

const storage = new LocalStorage();

function loadInstructions() {
  const instructionsFilePath = path.join(__dirname, "instructions.txt");
  return fs.readFileSync(instructionsFilePath, 'utf-8').trim();
}

const instructions = loadInstructions();

// Classify error for user-friendly messages
function formatError(error, context) {
  const msg = error?.message || String(error);

  // OpenAI errors
  if (msg.includes('OPENAI') || msg.includes('openai') || msg.includes('429') || msg.includes('rate limit')) {
    return `⚠️ **AI Service Temporarily Unavailable**\n\n${context}. The AI service is experiencing high demand. Please try again in a moment.`;
  }

  // Jira errors
  if (msg.includes('JIRA') || msg.includes('jira') || msg.includes('Unauthorized') || msg.includes('401')) {
    return `⚠️ **Jira Connection Issue**\n\n${context}. Please check that Jira is configured correctly and try again.`;
  }

  // Graph API / Meeting errors — these already have user-friendly messages from graphService
  if (msg.includes('denied access') || msg.includes('403 Forbidden') || msg.includes('Access Policy') || msg.includes('access policy')) {
    return `🔒 **Permissions Still Propagating**\n\n${msg}`;
  }
  if (msg.includes('Could not find this meeting') || msg.includes('Meeting not found')) {
    return `🔍 **Meeting Not Found**\n\n${msg}`;
  }
  if (msg.includes('No transcripts found') || msg.includes('No transcript') || msg.includes('transcript was found but') || msg.includes('transcript content')) {
    return `📋 ${msg}`;
  }
  if (msg.includes('Access denied') || msg.includes('Forbidden')) {
    return `🔒 ${msg}`;
  }

  // Network errors
  if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
    return `🌐 **Connection Issue**\n\n${context}. Please check your network and try again.`;
  }

  // Generic fallback — include the detail so users (and admins) can diagnose
  const detail = msg && msg !== 'undefined' && msg !== '[object Object]' ? `\n\n*Detail:* ${msg}` : '';
  return `⚠️ **Something went wrong**\n\n${context}.${detail}\n\nIf this keeps happening, try again or use \`/prd-from-text\` to paste the transcript directly.`;
}

// Input validation
function validateTranscript(text) {
  if (!text) return 'Please provide a transcript. Paste the full meeting transcript text after the command.';
  if (text.length < 50) return 'That transcript seems too short (less than 50 characters). Please paste the complete meeting transcript for a useful PRD.';
  if (text.length > 200000) return 'That transcript is very large (>200KB). Please trim it to the most relevant sections.';
  return null;
}

function validateMeetingUrl(url) {
  if (!url) return 'Please provide a Teams meeting URL.\n\nUsage: `/generate-prd <teams-meeting-join-url>`';
  if (!url.startsWith('http')) return 'That doesn\'t look like a valid URL. Please paste the full Teams meeting join URL (starts with https://).';
  if (!url.includes('teams') && !url.includes('microsoft')) return 'That doesn\'t look like a Microsoft Teams meeting URL. Please paste the join link from your Teams meeting invite.';
  return null;
}

// ─── Auth ───

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

const tokenCredentials = {
  clientId: process.env.CLIENT_ID || '',
  token: createTokenFactory()
};

const credentialOptions = config.MicrosoftAppType === "UserAssignedMsi" ? { ...tokenCredentials } : undefined;

const app = new App({
  ...credentialOptions,
  storage
});

// ─── Welcome / Install Event ───

app.on('install', async ({ send }) => {
  try {
    await send(cardMessage(buildWelcomeCard()));
  } catch (err) {
    console.error('[install] Failed to send welcome card:', err);
  }
});

// Also handle conversationUpdate for when bot is added
app.on('conversationUpdate', async ({ send, activity }) => {
  try {
    const membersAdded = activity.membersAdded || [];
    const botId = activity.recipient?.id;
    const botWasAdded = membersAdded.some(m => m.id === botId);
    if (botWasAdded) {
      await send(cardMessage(buildWelcomeCard()));
    }
  } catch (err) {
    console.error('[conversationUpdate] Failed to send welcome card:', err);
  }
});

// ─── Meeting End Handler (Auto-Transcript) ───

app.on('meetingEnd', async ({ send, activity }) => {
  try {
    const meetingData = activity.value || {};
    const { joinUrl, title, id: meetingId } = meetingData;

    console.log(`[meetingEnd] Meeting ended: "${title}" (id: ${meetingId})`);

    if (!joinUrl) {
      console.log('[meetingEnd] No joinUrl in meeting end event, skipping auto-transcript');
      return;
    }

    // Notify users that we'll try to fetch the transcript
    await send(cardMessage(buildProgressCard(
      `Meeting "${title || 'Untitled'}" has ended. Checking for transcript...`,
      1, 3
    )));

    // Transcripts take time to process after meeting ends.
    // Retry with exponential backoff: wait 15s, 30s, 60s
    const delays = [15000, 30000, 60000];
    let transcript = null;
    let meetingSubject = title || 'Untitled Meeting';

    for (let attempt = 0; attempt < delays.length; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));

      try {
        const result = await getMeetingTranscript(joinUrl);
        transcript = result.transcript;
        meetingSubject = result.meetingSubject || meetingSubject;
        break;
      } catch (err) {
        const isNotReady = err.message?.includes('No transcripts found') ||
                          err.message?.includes('not found');
        if (isNotReady && attempt < delays.length - 1) {
          console.log(`[meetingEnd] Transcript not ready yet (attempt ${attempt + 1}), retrying...`);
          continue;
        }
        if (isNotReady) {
          // After all retries, transcript wasn't enabled for this meeting
          console.log('[meetingEnd] No transcript available after retries — transcription may not have been enabled');
          await send(new MessageActivity(
            `📝 No transcript was found for "${meetingSubject}". ` +
            `Make sure transcription is enabled during the meeting.\n\n` +
            `You can still paste a transcript manually with: \`/prd-from-text <transcript>\``
          ));
          return;
        }
        throw err; // Non-retriable error
      }
    }

    if (!transcript) return;

    // Generate summary for review before PRD
    await send(cardMessage(buildProgressCard(
      `Got transcript for "${meetingSubject}". Generating summary...`,
      2, 3
    )));

    const { summary } = await generateSummary(transcript);

    const dataId = `data_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(dataId, { transcript, meetingSubject });

    await send(cardMessage(buildSummaryCard(summary, meetingSubject, dataId, 'meeting')));
    console.log(`[meetingEnd] Summary generated for "${meetingSubject}", awaiting confirmation`);

  } catch (err) {
    console.error('[meetingEnd] Error:', err);
    const errorMsg = formatError(err, `Failed to process meeting transcript`);
    await send(cardMessage(buildErrorCard(errorMsg)));
  }
});

// ─── Message Handler ───

app.on('message', async ({ send, stream, activity }) => {
  // Deduplication: skip retried messages
  if (isDuplicate(activity.id)) {
    console.log(`[dedup] Skipping duplicate activity: ${activity.id}`);
    return;
  }

  // ─── Adaptive Card Action.Submit ───
  if (activity.value && activity.value.action) {
    const data = activity.value;
    console.log('[card.submit] Action received:', data.action);

    // Dedup card submits — Teams retries these when OpenAI calls take >15s
    if (isActionDuplicate(data)) {
      console.log(`[dedup] Skipping duplicate card action: ${data.action}`);
      return;
    }

    if (data.action === 'confirmSummary') {
      handleConfirmSummary(send, data, activity).catch(err => {
        console.error('[confirmSummary] Unhandled error:', err);
      });
      return;
    }

    if (data.action === 'generateTickets') {
      handleGenerateTickets(send, data, activity).catch(err => {
        console.error('[generateTickets] Unhandled error:', err);
      });
      return;
    }

    if (data.action === 'submitSelectedToJira') {
      handleSubmitSelectedToJira(send, data).catch(err => {
        console.error('[submitSelectedToJira] Unhandled error:', err);
      });
      return;
    }

    if (data.action === 'submitToJira') {
      // Legacy support
      handleSubmitToJira(send, data).catch(err => {
        console.error('[submitToJira] Unhandled error:', err);
      });
      return;
    }

    if (data.action === 'showEditMenu') {
      handleShowEditMenu(send, data).catch(err => {
        console.error('[showEditMenu] Unhandled error:', err);
      });
      return;
    }

    if (data.action === 'editTicket') {
      handleEditTicket(send, data).catch(err => {
        console.error('[editTicket] Unhandled error:', err);
      });
      return;
    }

    if (data.action === 'saveTicketEdit') {
      handleSaveTicketEdit(send, data).catch(err => {
        console.error('[saveTicketEdit] Unhandled error:', err);
      });
      return;
    }

    if (data.action === 'cancelTicketEdit') {
      handleCancelTicketEdit(send, data).catch(err => {
        console.error('[cancelTicketEdit] Unhandled error:', err);
      });
      return;
    }

    if (data.action === 'retryPrdFromText') {
      const transcript = storage.get(data.transcriptId);
      if (!transcript) {
        await send(cardMessage(buildErrorCard('Original transcript has expired. Please paste it again with /prd-from-text.')));
        return;
      }
      handlePrdFromText(send, transcript).catch(err => {
        console.error('[retryPrdFromText] Unhandled error:', err);
      });
      return;
    }

    if (data.action === 'retryGeneratePrd') {
      const url = storage.get(data.urlId);
      if (!url) {
        await send(cardMessage(buildErrorCard('Meeting URL data has expired. Please run /generate-prd again.')));
        return;
      }
      handleGeneratePrdFromUrl(send, url).catch(err => {
        console.error('[retryGeneratePrd] Unhandled error:', err);
      });
      return;
    }

    console.log('[card.submit] Unknown action:', data.action);
    return;
  }

  const text = (activity.text || '').trim();
  const cleanText = text.replace(/<at[^>]*>.*?<\/at>\s*/gi, '').trim();
  const lowerText = cleanText.toLowerCase();

  // ─── Help Command ───
  if (lowerText === '/help' || lowerText === 'help' || lowerText.includes('how can you help')) {
    await send(cardMessage(buildHelpCard()));
    return;
  }

  // ─── /prd-from-text ───
  if (cleanText.startsWith('/prd-from-text')) {
    const transcript = cleanText.replace('/prd-from-text', '').trim();
    const validationError = validateTranscript(transcript);
    if (validationError) {
      await send(cardMessage(buildValidationCard(validationError)));
      return;
    }
    // Fire and forget — handler sends progress card immediately
    handlePrdFromText(send, transcript).catch(err => {
      console.error('[prd-from-text] Unhandled error:', err);
    });
    return;
  }

  // ─── /generate-prd ───
  if (cleanText.startsWith('/generate-prd')) {
    const joinUrl = cleanText.replace('/generate-prd', '').trim();
    const validationError = validateMeetingUrl(joinUrl);
    if (validationError) {
      await send(cardMessage(buildValidationCard(validationError)));
      return;
    }
    handleGeneratePrdFromUrl(send, joinUrl).catch(err => {
      console.error('[generate-prd] Unhandled error:', err);
    });
    return;
  }

  // ─── PRD Edit Mode: Check if user has an active PRD editing session ───
  const conversationId = activity.conversation.id;
  const activePrdKey = `activePrd_${conversationId}`;
  const activePrdData = storage.get(activePrdKey);

  if (activePrdData && cleanText && !lowerText.startsWith('/')) {
    handlePrdEdit(send, activePrdData, cleanText, activePrdKey).catch(err => {
      console.error('[prdEdit] Unhandled error:', err);
    });
    return;
  }

  // ─── Default: AI Chat ───
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
    console.error('[chat] AI error:', error);
    const errorMsg = formatError(error, 'Failed to generate a response');
    await send(cardMessage(buildErrorCard(errorMsg)));
  }
});

// ─── Command Handlers ───

async function handlePrdFromText(send, transcript) {
  const transcriptId = `transcript_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  storage.set(transcriptId, transcript);

  try {
    await send(cardMessage(buildProgressCard('Analyzing transcript...', 1, 2)));

    const { summary } = await generateSummary(transcript);

    // Store transcript for later PRD generation
    const dataId = `data_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(dataId, { transcript, transcriptId });

    await send(cardMessage(buildSummaryCard(summary, 'Manual Transcript', dataId, 'text')));
  } catch (error) {
    console.error('[prd-from-text] Error:', error);
    const errorMsg = formatError(error, 'Failed to generate summary from transcript');
    await send(cardMessage(buildErrorCard(errorMsg, 'retryPrdFromText', { transcriptId })));
  }
}

async function handleGeneratePrdFromUrl(send, joinUrl) {
  const urlId = `url_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  storage.set(urlId, joinUrl);

  try {
    await send(cardMessage(buildProgressCard('Fetching meeting transcript from Teams...', 1, 3)));

    const { transcript, meetingSubject } = await getMeetingTranscript(joinUrl);

    await send(cardMessage(buildProgressCard(`Got transcript for "${meetingSubject}". Generating summary...`, 2, 3)));

    const { summary } = await generateSummary(transcript);

    // Store transcript for later PRD generation
    const dataId = `data_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(dataId, { transcript, meetingSubject, urlId });

    await send(cardMessage(buildSummaryCard(summary, meetingSubject, dataId, 'url')));
  } catch (error) {
    console.error('[generate-prd] Error:', error?.statusCode || '', error?.message || error);
    if (error?.body) console.error('[generate-prd] Response body:', JSON.stringify(error.body).slice(0, 500));
    const errorMsg = formatError(error, 'Failed to generate PRD from meeting');
    await send(cardMessage(buildErrorCard(errorMsg, 'retryGeneratePrd', { urlId })));
  }
}

async function handleConfirmSummary(send, data, activity) {
  try {
    const storedData = storage.get(data.dataId);
    if (!storedData) {
      await send(cardMessage(buildErrorCard('Session data has expired. Please start again with /generate-prd or /prd-from-text.')));
      return;
    }

    const { transcript, meetingSubject } = storedData;
    const additionalNotes = data.additionalNotes || '';

    await send(cardMessage(buildProgressCard('Generating PRD...', 1, 1)));

    // Append additional notes to transcript if provided
    const fullInput = additionalNotes
      ? `${transcript}\n\n--- Additional Notes ---\n${additionalNotes}`
      : transcript;

    const { prd } = await generatePRD(fullInput);

    const prdId = `prd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(prdId, prd);

    // Set active PRD editing session for the conversation
    const conversationId = activity.conversation.id;
    const activePrdKey = `activePrd_${conversationId}`;
    storage.set(activePrdKey, { prdId, meetingSubject: meetingSubject || 'Manual Transcript' });

    await send(cardMessage(buildPRDCard(prd, meetingSubject || 'Manual Transcript', prdId)));
    console.log(`[confirmSummary] PRD generated, editing session active for conversation`);
  } catch (error) {
    console.error('[confirmSummary] Error:', error);
    const errorMsg = formatError(error, 'Failed to generate PRD');
    await send(cardMessage(buildErrorCard(errorMsg)));
  }
}

async function handlePrdEdit(send, activePrdData, editInstruction, activePrdKey) {
  try {
    const { prdId, meetingSubject } = activePrdData;
    const currentPrd = storage.get(prdId);
    if (!currentPrd) {
      storage.delete(activePrdKey);
      await send(cardMessage(buildErrorCard('PRD data has expired. Please start again.')));
      return;
    }

    await send(cardMessage(buildProgressCard('Applying your edits to the PRD...', 1, 1)));

    const { prd: updatedPrd } = await editPRD(currentPrd, editInstruction);

    // Update stored PRD
    storage.set(prdId, updatedPrd);

    await send(cardMessage(buildPRDCard(updatedPrd, meetingSubject, prdId)));
    console.log(`[prdEdit] PRD updated with edit: "${editInstruction.substring(0, 50)}..."`);
  } catch (error) {
    console.error('[prdEdit] Error:', error);
    const errorMsg = formatError(error, 'Failed to apply edit to PRD');
    await send(cardMessage(buildErrorCard(errorMsg)));
  }
}

async function handleGenerateTickets(send, data, activity) {
  try {
    const prd = storage.get(data.prdId);
    if (!prd) {
      await send(cardMessage(buildErrorCard('PRD data has expired. Please run /prd-from-text again to regenerate.')));
      return;
    }

    // Clear PRD editing session since user is moving to tickets
    if (activity) {
      const conversationId = activity.conversation.id;
      const activePrdKey = `activePrd_${conversationId}`;
      storage.delete(activePrdKey);
    }

    await send(cardMessage(buildProgressCard('Generating Jira ticket drafts from PRD...', 1, 2)));

    const projectKey = data.projectKey || config.jiraProjectKey;
    const { tickets } = await generateTickets(prd, projectKey);

    if (!tickets || tickets.length === 0) {
      await send(cardMessage(buildErrorCard('No tickets were generated from the PRD. The PRD may not contain actionable items.')));
      return;
    }

    const ticketsId = `tickets_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(ticketsId, tickets);

    await send(cardMessage(buildTicketDraftsCard(tickets, projectKey, ticketsId)));
  } catch (error) {
    console.error('[generateTickets] Error:', error);
    const errorMsg = formatError(error, 'Failed to generate Jira tickets');
    await send(cardMessage(buildErrorCard(errorMsg, 'generateTickets', { prdId: data.prdId })));
  }
}

async function handleShowEditMenu(send, data) {
  try {
    const tickets = storage.get(data.ticketsId);
    if (!tickets) {
      await send(cardMessage(buildErrorCard('Ticket data has expired. Please regenerate tickets from the PRD.')));
      return;
    }

    await send(cardMessage(buildEditTicketMenuCard(tickets, data.ticketsId, data.projectKey)));
  } catch (error) {
    console.error('[showEditMenu] Error:', error);
    const errorMsg = formatError(error, 'Failed to show edit menu');
    await send(cardMessage(buildErrorCard(errorMsg)));
  }
}

async function handleEditTicket(send, data) {
  try {
    const tickets = storage.get(data.ticketsId);
    if (!tickets) {
      await send(cardMessage(buildErrorCard('Ticket data has expired. Please regenerate tickets from the PRD.')));
      return;
    }

    const ticketIndex = data.ticketIndex;
    if (ticketIndex < 0 || ticketIndex >= tickets.length) {
      await send(cardMessage(buildErrorCard('Invalid ticket index.')));
      return;
    }

    await send(cardMessage(buildEditTicketCard(tickets[ticketIndex], ticketIndex, data.ticketsId, data.projectKey)));
  } catch (error) {
    console.error('[editTicket] Error:', error);
    const errorMsg = formatError(error, 'Failed to load ticket for editing');
    await send(cardMessage(buildErrorCard(errorMsg)));
  }
}

async function handleSaveTicketEdit(send, data) {
  try {
    const tickets = storage.get(data.ticketsId);
    if (!tickets) {
      await send(cardMessage(buildErrorCard('Ticket data has expired. Please regenerate tickets from the PRD.')));
      return;
    }

    const ticketIndex = data.ticketIndex;
    if (ticketIndex < 0 || ticketIndex >= tickets.length) {
      await send(cardMessage(buildErrorCard('Invalid ticket index.')));
      return;
    }

    // Apply edits
    const ticket = tickets[ticketIndex];
    if (data.editTitle) {
      ticket.fields.summary = data.editTitle;
    }
    if (data.editDescription !== undefined) {
      ticket.fields.description = plainTextToAdf(data.editDescription);
    }
    if (data.editPriority) {
      ticket.fields.priority = { name: data.editPriority };
    }

    // Save updated tickets
    storage.set(data.ticketsId, tickets);

    const projectKey = data.projectKey || config.jiraProjectKey;
    await send(cardMessage(buildTicketDraftsCard(tickets, projectKey, data.ticketsId)));
    console.log(`[saveTicketEdit] Ticket ${ticketIndex} updated: "${ticket.fields.summary}"`);
  } catch (error) {
    console.error('[saveTicketEdit] Error:', error);
    const errorMsg = formatError(error, 'Failed to save ticket changes');
    await send(cardMessage(buildErrorCard(errorMsg)));
  }
}

async function handleCancelTicketEdit(send, data) {
  try {
    const tickets = storage.get(data.ticketsId);
    if (!tickets) {
      await send(cardMessage(buildErrorCard('Ticket data has expired. Please regenerate tickets from the PRD.')));
      return;
    }

    const projectKey = data.projectKey || config.jiraProjectKey;
    await send(cardMessage(buildTicketDraftsCard(tickets, projectKey, data.ticketsId)));
  } catch (error) {
    console.error('[cancelTicketEdit] Error:', error);
    const errorMsg = formatError(error, 'Failed to return to ticket drafts');
    await send(cardMessage(buildErrorCard(errorMsg)));
  }
}

async function handleSubmitSelectedToJira(send, data) {
  try {
    const allTickets = storage.get(data.ticketsId);
    if (!allTickets) {
      await send(cardMessage(buildErrorCard('Ticket data has expired. Please regenerate tickets from the PRD.')));
      return;
    }

    // Filter tickets based on toggle values (include_0, include_1, etc.)
    const selectedTickets = allTickets.filter((_, i) => {
      const toggleValue = data[`include_${i}`];
      // Default to included if toggle value not present (cards may not send default values)
      return toggleValue !== 'false';
    });

    if (selectedTickets.length === 0) {
      await send(cardMessage(buildErrorCard('No tickets selected. Please toggle on at least one ticket to push to Jira.')));
      return;
    }

    await send(cardMessage(buildProgressCard(
      `Submitting ${selectedTickets.length} of ${allTickets.length} tickets to Jira...`,
      1, 1
    )));

    const results = await submitToJira(selectedTickets);

    await send(cardMessage(buildJiraResultCard(results)));
  } catch (error) {
    console.error('[submitSelectedToJira] Error:', error);
    const errorMsg = formatError(error, 'Failed to submit tickets to Jira');
    await send(cardMessage(buildErrorCard(errorMsg, 'submitSelectedToJira', { ticketsId: data.ticketsId, projectKey: data.projectKey })));
  }
}

async function handleSubmitToJira(send, data) {
  try {
    const tickets = storage.get(data.ticketsId);
    if (!tickets) {
      await send(cardMessage(buildErrorCard('Ticket data has expired. Please regenerate tickets from the PRD.')));
      return;
    }

    await send(cardMessage(buildProgressCard('Submitting tickets to Jira...', 1, 1)));

    const results = await submitToJira(tickets);

    await send(cardMessage(buildJiraResultCard(results)));
  } catch (error) {
    console.error('[submitToJira] Error:', error);
    const errorMsg = formatError(error, 'Failed to submit tickets to Jira');
    await send(cardMessage(buildErrorCard(errorMsg, 'submitToJira', { ticketsId: data.ticketsId, projectKey: data.projectKey })));
  }
}

// ─── Feedback Handler ───

app.on('message.submit.feedback', async ({ activity }) => {
  console.log("Feedback received:", JSON.stringify(activity.value));
});

module.exports = app;
