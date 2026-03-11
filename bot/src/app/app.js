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
const { generateWorkItems, submitToAdo } = require('../services/adoTicketService');
const {
  buildPRDCard,
  buildSummaryCard,
  buildWorkItemDraftsCard,
  buildEditWorkItemMenuCard,
  buildEditWorkItemCard,
  buildAdoResultCard,
  buildProgressCard,
  buildErrorCard,
  buildWelcomeCard,
  buildHelpCard,
  buildValidationCard,
} = require('../services/adaptiveCards');

// ─── Deduplication ───
const processedActivities = new Map();
const DEDUP_TTL_MS = 5 * 60 * 1000;
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

function isActionDuplicate(data) {
  if (!data?.action) return false;
  const key = `action:${data.action}:${data.prdId || data.workItemsId || data.transcriptId || data.urlId || data.dataId || ''}`;
  if (processedActivities.has(key)) return true;
  processedActivities.set(key, Date.now());
  return false;
}

// ─── Helpers ───

function cardMessage(card) {
  return new MessageActivity('').addAttachments(card);
}

const storage = new LocalStorage();

// ─── Hardcoded Demo Meeting Transcripts ───

const DEMO_MEETINGS = [
  {
    title: "Product Strategy Sync — March 5",
    transcript: `Sarah Chen: Alright everyone, thanks for joining. Let's talk about the checkout redesign. We've been seeing a 68% cart abandonment rate which is way above industry average.

Marcus Johnson: Yeah, I pulled the analytics last week. The biggest drop-off is at the shipping step — users see the shipping costs for the first time and bail. It's classic sticker shock.

Sarah Chen: Exactly. And 34% of abandoning users cite forced account creation as the reason they left. We need guest checkout.

Priya Patel: From a UX perspective, the current 5-step flow is painful on mobile. Mobile abandonment is at 78%. I've been sketching a single-page checkout with collapsible sections.

Marcus Johnson: That aligns with what Stripe recommends. They also suggest we add Apple Pay and Google Pay — their data shows express payments can boost conversion by 12-15%.

Sarah Chen: Love it. Let's target getting abandonment under 50% and checkout time under 90 seconds. Priya, can you have designs ready by March 15?

Priya Patel: Absolutely. I'll cover all breakpoints and states in Figma.

David Kim: From the backend side, we'll need a new endpoint for real-time shipping rate calculation. I can integrate ShipEngine for that. Also need to upgrade Stripe SDK to v3 for the payment request API.

Sarah Chen: What about the address form? Users hate typing addresses on mobile.

Priya Patel: Google Places autocomplete. We just need an API key provisioned.

Marcus Johnson: I'll handle that. Also want to flag — we should keep BNPL out of scope for phase 1. Klarna integration is complex and we can add it in Q3.

Sarah Chen: Agreed. Let's keep scope tight: single-page layout, guest checkout, express payments, real-time shipping, inline validation. David, can you have API contracts ready by March 22?

David Kim: Done. I'll mock the endpoints so frontend can start in parallel.

Sarah Chen: Great. Two sprints for build, one for QA, then staged rollout starting May 3. Any blockers?

David Kim: Just need QA to set up the load testing environment for concurrent checkout simulation. We should handle 10K concurrent sessions.

Sarah Chen: I'll coordinate with QA. Anything else? No? Let's ship it.`
  },
  {
    title: "Technical Deep Dive — March 7",
    transcript: `David Kim: Hey team, wanted to do a quick technical deep dive on the checkout implementation before we start sprinting.

Priya Patel: Great timing. I just finished the initial wireframes. The single-page layout has four collapsible sections: Shipping, Billing, Payment, and Review. Order summary stays pinned on the right on desktop, stacks on top for mobile.

David Kim: Perfect. For the shipping rates endpoint, I'm thinking POST /api/shipping/rates with zipCode and cartItems. We cache responses for 15 minutes per zip+cart combo to avoid hammering ShipEngine.

Marcus Johnson: Smart. What about error handling if ShipEngine is down?

David Kim: Graceful fallback — show a flat-rate estimate with a note that exact rates will be calculated at confirmation. We should also have a circuit breaker pattern.

Priya Patel: For the address autocomplete, I want to debounce the Google Places API calls. Maybe 300ms delay after last keystroke.

David Kim: Yeah, and we should limit it to US and Canada for launch. We can add international later.

Marcus Johnson: On the Stripe side, I've been testing the Payment Request API. Apple Pay works great on Safari, Google Pay on Chrome. The cool thing is Stripe handles the detection — if neither is available, the buttons just don't render.

David Kim: Nice. One thing I want to flag — we need PCI DSS Level 1 compliance for all payment data. That means no card numbers touch our servers. Everything goes through Stripe's client-side tokenization.

Priya Patel: For accessibility, I'm designing with WCAG 2.1 AA in mind. Full keyboard navigation, proper ARIA labels, and all form errors announced to screen readers.

David Kim: Love it. I'll also add proper focus management — when a section completes and the next one expands, focus should move to the first input of the new section.

Marcus Johnson: What about the promo code field? Sarah mentioned it in the strategy call.

Priya Patel: I'm putting it in the order summary sidebar. Inline entry with real-time discount calculation. Still debating whether to show it by default or behind a "Have a code?" toggle.

David Kim: Let's go with the toggle — keeps the UI cleaner for users who don't have codes.

Marcus Johnson: Agreed. One last thing — the confirmation page. We need order number, estimated delivery based on selected shipping, and trigger the email confirmation. Plus for guest users, the "create an account" upsell.

David Kim: I'll spec all of this in the API contracts doc by March 22. Let's plan Sprint 1 for the layout, guest checkout, and address form. Sprint 2 for payments, validation, and the summary sidebar.

Priya Patel: Sounds good. I'll have the full Figma file done by Friday.

David Kim: Alright, we've got a solid plan. Let's execute.`
  },
  {
    title: "Meridian Health Systems – Patient Portal: Visit Preparation Cards — March 9",
    transcript: `Liam O'Brien: Alright, let's get started. We're here to walk through the visit preparation cards initiative for the patient portal app. Angela, do you want to kick us off with the overview?

Angela Torres: Sure. So the core idea here is that we're introducing a set of sequential educational cards within the Upcoming Visit view on the mobile app. The goal is to guide patients through pre-appointment action items — things like what documents to bring, how check-in works, where to park, where to go once they're inside the building. We want to reduce anxiety for patients who may be visiting a new facility or dealing with an unfamiliar procedure.

Natalie Greer: And just to add some context from the patient experience side, we hear a lot from front desk staff that patients arrive unsure about which entrance to use, whether they need a referral letter, or how the self-check-in kiosks work. These cards are meant to front-load that information so patients feel prepared before they even leave the house.

Liam O'Brien: Great. Angela, can you walk us through the card sequence?

Angela Torres: Absolutely. So when a patient has an upcoming visit, they'll see a series of cards in a specific order. First up is check-in information. Then, depending on what's flagged in the patient record, we break out into two additional cards — one for interpreter services and one for mobility assistance. After that, we move into documents to bring, how check-in works, how to use the kiosk, and facility wayfinding. Seven cards total.

David Kwan: I can go through each one in a bit more detail. Card 1 is Mobility Assistance — that's for patients who have accessibility needs noted in their chart. Card 2 is Interpreter Services, same idea, only shown if there's a language preference on file. Card 3 is Check-In Information, and this one actually has two variants. If you're visiting one of our outpatient clinics, you'll see the clinic check-in version. If you're going to the main hospital campus, you see the hospital version. The process differs a bit because the clinic locations use a different intake system.

Ravi Deshmukh: Quick question on that — are we determining clinic versus hospital based on the facility code tied to the appointment?

Angela Torres: Correct, yes. It keys off the facility code in the scheduling system.

David Kwan: Moving on — Card 4 is Documents to Bring. This tells the patient what they need to have ready. Right now that covers insurance card, photo ID, and referral letter if the visit type requires one. Card 5 is How Check-In Works, which explains the arrival process and the difference between the staffed desk and the self-service line. Card 6 is How to Use the Kiosk, which branches into the QR code scan if the facility supports it, or the manual entry process. And then Card 7 is Facility Wayfinding, which covers parking — both garage and surface lot — elevator access to the correct floor, and department signage.

Liam O'Brien: So not every patient sees every card?

Angela Torres: Right. The cards are contextual. A patient might see the clinic check-in card, insurance card, photo ID, QR code scan, and garage parking. If they also have interpreter services or mobility assistance flagged, those cards show up too. But if none of that applies, those cards just don't appear.

Natalie Greer: That was a big design principle for us. We didn't want to overwhelm people with information that isn't relevant to their visit.

Liam O'Brien: Makes sense. David, what about the animations?

David Kwan: Each card has a collapsed and expanded state. In the collapsed view, you see a summary — just enough to know what the card is about. When you tap into it, you get the full content with animations that walk you through the process visually. We've been testing a few animation styles and the response has been positive. They're simple, instructional — think short looping illustrations rather than video.

Ravi Deshmukh: From an engineering standpoint, the animations are lightweight. We're rendering them natively so there's no load time or buffering. They play inline within the card.

Liam O'Brien: And timing-wise — when do patients start seeing these?

Angela Torres: As soon as the appointment is confirmed in the system. That could be days or even weeks before the visit. So if someone checks the app the night before, they'll see the cards. And importantly, patients will see cards for all appointments in a given day, not just the first one. So if you have lab work at the outpatient clinic in the morning and then a specialist visit at the main hospital in the afternoon, you'd see the relevant cards for both.

Natalie Greer: That's a big deal for patients with multiple appointments. The check-in process can be completely different between a clinic and the main campus, and a lot of patients don't realize that until they're standing in the wrong lobby.

Liam O'Brien: Alright. Any blockers or open items?

Ravi Deshmukh: We're in good shape on the engineering side. The card framework is built and we're plugging in the content now. Main dependency is final animation assets from the design team.

David Kwan: Those are on track. We should have final assets delivered by end of next week.

Angela Torres: Only other thing I'd flag is that we'll want to coordinate with the facilities management team on the wayfinding content to make sure we're aligned on the latest signage and parking changes, especially for the outpatient clinics.

Liam O'Brien: Noted. I'll set up that touchpoint. Anything else? Alright, good meeting everyone. Let's reconvene next week for a progress check.`
  }
];

function getDemoTranscriptsCombined() {
  return DEMO_MEETINGS.map(m => `=== ${m.title} ===\n\n${m.transcript}`).join('\n\n\n');
}

// ─── Intent Detection ───

function detectIntent(text) {
  const lower = text.toLowerCase();

  // Check for "most recent meeting" / "latest meeting" PRD request
  if (
    (lower.includes('recent') || lower.includes('latest') || lower.includes('last')) &&
    (lower.includes('meeting') || lower.includes('transcript')) &&
    (lower.includes('prd') || lower.includes('document') || lower.includes('summarize') || lower.includes('summary') || lower.includes('recap'))
  ) {
    return 'recent_meeting_prd';
  }

  // Check for meeting/PRD creation intent
  if (
    (lower.includes('prd') || lower.includes('product requirement') || lower.includes('document')) &&
    (lower.includes('create') || lower.includes('draft') || lower.includes('generate') || lower.includes('write') || lower.includes('make') || lower.includes("let's"))
  ) {
    if (lower.includes('meeting') || lower.includes('transcript') || lower.includes('discussion') || lower.includes('context')) {
      if (lower.includes('draft') || lower.includes('with this context') || lower.includes('go ahead') || lower.includes('create the prd') || lower.includes('write the prd') || lower.includes('generate the prd')) {
        return 'draft_prd';
      }
      return 'summarize_meetings';
    }
    return 'draft_prd';
  }

  // "summarize meetings" / "what did we discuss"
  if (
    (lower.includes('meeting') || lower.includes('transcript') || lower.includes('discussion')) &&
    (lower.includes('summarize') || lower.includes('summary') || lower.includes('recap') || lower.includes('what did we'))
  ) {
    return 'summarize_meetings';
  }

  // "draft" / "write" / "go ahead" — in context of existing summary
  if (lower.includes('draft') || lower.includes('go ahead') || lower.includes('looks good') || lower.includes('proceed')) {
    return 'draft_prd';
  }

  // Generate work items
  if (
    (lower.includes('work item') || lower.includes('ticket') || lower.includes('ado') || lower.includes('azure devops')) &&
    (lower.includes('generate') || lower.includes('create') || lower.includes('make'))
  ) {
    return 'generate_work_items';
  }

  // Help
  if (lower === 'help' || lower === '/help' || lower.includes('how can you help')) {
    return 'help';
  }

  // PRD edit
  if (lower.includes('add') || lower.includes('remove') || lower.includes('change') || lower.includes('update') || lower.includes('edit') || lower.includes('modify')) {
    return 'edit_prd';
  }

  return 'chat';
}

// ─── Conversation Context Management ───

function getConversationContext(conversationId) {
  return storage.get(`demoCtx_${conversationId}`) || { stage: 'idle', additionalContext: [] };
}

function setConversationContext(conversationId, ctx) {
  storage.set(`demoCtx_${conversationId}`, ctx);
}

// ─── Check if bot is @mentioned ───

function isBotMentioned(activity) {
  if (!activity.conversation.isGroup) return true;

  const entities = activity.entities || [];
  const botId = activity.recipient?.id;
  for (const entity of entities) {
    if (entity.type === 'mention') {
      if (entity.mentioned?.id === botId) return true;
      if (entity.mentioned?.name && (
        entity.mentioned.name.toLowerCase().includes('cortex') ||
        entity.mentioned.name.toLowerCase().includes('transcript')
      )) return true;
    }
  }

  const text = (activity.text || '').toLowerCase();
  if (text.includes('<at>cortex</at>') || text.includes('<at>transcript')) return true;

  return false;
}

// ─── Error Formatting ───

function formatError(error, context) {
  const msg = error?.message || String(error);
  if (msg.includes('openai') || msg.includes('429') || msg.includes('rate limit')) {
    return `⚠️ **AI Service Temporarily Unavailable**\n\n${context}. Please try again in a moment.`;
  }
  if (msg.includes('Azure DevOps') || msg.includes('Unauthorized') || msg.includes('401') || msg.includes('ADO')) {
    return `⚠️ **Azure DevOps Connection Issue**\n\n${context}. Please check configuration.`;
  }
  const detail = msg && msg !== 'undefined' ? `\n\n*Detail:* ${msg}` : '';
  return `⚠️ **Something went wrong**\n\n${context}.${detail}`;
}

// ─── Auth ───

const createTokenFactory = () => {
  return async (scope, tenantId) => {
    const managedIdentityCredential = new ManagedIdentityCredential({
      clientId: process.env.CLIENT_ID
    });
    const scopes = Array.isArray(scope) ? scope : [scope];
    const tokenResponse = await managedIdentityCredential.getToken(scopes, { tenantId });
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
  try { await send(cardMessage(buildWelcomeCard())); } catch (err) { console.error('[install] Error:', err); }
});

app.on('conversationUpdate', async ({ send, activity }) => {
  try {
    const membersAdded = activity.membersAdded || [];
    const botId = activity.recipient?.id;
    if (membersAdded.some(m => m.id === botId)) {
      await send(cardMessage(buildWelcomeCard()));
    }
  } catch (err) { console.error('[conversationUpdate] Error:', err); }
});

// ─── Message Handler ───

app.on('message', async ({ send, stream, activity }) => {
  if (isDuplicate(activity.id)) return;

  // ─── Adaptive Card Action.Submit (always handle) ───
  if (activity.value && activity.value.action) {
    const data = activity.value;
    console.log('[card.submit] Action received:', data.action);
    if (isActionDuplicate(data)) return;

    if (data.action === 'confirmSummary') {
      handleConfirmSummary(send, data, activity).catch(err => console.error('[confirmSummary] Error:', err));
      return;
    }
    if (data.action === 'generateWorkItems') {
      handleGenerateWorkItems(send, data, activity).catch(err => console.error('[generateWorkItems] Error:', err));
      return;
    }
    if (data.action === 'submitSelectedToAdo') {
      handleSubmitSelectedToAdo(send, data).catch(err => console.error('[submitSelectedToAdo] Error:', err));
      return;
    }
    if (data.action === 'submitToAdo') {
      handleSubmitToAdo(send, data).catch(err => console.error('[submitToAdo] Error:', err));
      return;
    }
    if (data.action === 'showEditMenu') {
      handleShowEditMenu(send, data).catch(err => console.error('[showEditMenu] Error:', err));
      return;
    }
    if (data.action === 'editWorkItem') {
      handleEditWorkItem(send, data).catch(err => console.error('[editWorkItem] Error:', err));
      return;
    }
    if (data.action === 'saveWorkItemEdit') {
      handleSaveWorkItemEdit(send, data).catch(err => console.error('[saveWorkItemEdit] Error:', err));
      return;
    }
    if (data.action === 'cancelWorkItemEdit') {
      handleCancelWorkItemEdit(send, data).catch(err => console.error('[cancelWorkItemEdit] Error:', err));
      return;
    }
    console.log('[card.submit] Unknown action:', data.action);
    return;
  }

  const text = (activity.text || '').trim();
  const cleanText = text.replace(/<at[^>]*>.*?<\/at>\s*/gi, '').trim();
  const lowerText = cleanText.toLowerCase();
  const conversationId = activity.conversation.id;
  const mentioned = isBotMentioned(activity);
  const ctx = getConversationContext(conversationId);

  // ─── "Generate Work Items" — allow without @mention if we have a PRD ───
  if (
    (lowerText.includes('generate') && (lowerText.includes('work item') || lowerText.includes('ticket') || lowerText.includes('ado'))) ||
    (lowerText.includes('create') && (lowerText.includes('work item') || lowerText.includes('ticket')))
  ) {
    if (ctx.stage === 'prd_done' && ctx.prdId) {
      handleGenerateWorkItemsFromContext(send, ctx, conversationId).catch(err => console.error('[genWorkItems] Error:', err));
      return;
    }
  }

  // ─── Only require @mention if conversation has no active context ───
  if (!mentioned && ctx.stage === 'idle') return;

  const effectivelyMentioned = mentioned || ctx.stage !== 'idle';

  // ─── Legacy command support ───
  if (cleanText.startsWith('/prd-from-text')) {
    const transcript = cleanText.replace('/prd-from-text', '').trim();
    if (!transcript || transcript.length < 50) {
      await send(cardMessage(buildValidationCard('Please provide a transcript (at least 50 characters).')));
      return;
    }
    handlePrdFromText(send, transcript).catch(err => console.error('[prd-from-text] Error:', err));
    return;
  }

  if (lowerText === '/help' || lowerText === 'help') {
    await send(cardMessage(buildHelpCard()));
    return;
  }

  // ─── Conversational Intent Detection ───
  const intent = detectIntent(cleanText);
  console.log(`[demo] Intent: ${intent}, Stage: ${ctx.stage}, Text: "${cleanText.substring(0, 80)}"`);

  switch (intent) {
    case 'help':
      await send(cardMessage(buildHelpCard()));
      break;

    case 'recent_meeting_prd':
      handleRecentMeetingPrd(send, conversationId).catch(err => console.error('[recentMeetingPrd] Error:', err));
      break;

    case 'summarize_meetings':
      handleSummarizeMeetings(send, conversationId).catch(err => console.error('[summarize] Error:', err));
      break;

    case 'draft_prd':
      if (ctx.stage === 'summary_done' || ctx.stage === 'context_added') {
        handleDraftPrd(send, ctx, conversationId).catch(err => console.error('[draftPrd] Error:', err));
      } else if (ctx.stage === 'prd_done') {
        await send(new MessageActivity(
          "I've already generated a PRD. You can:\n" +
          "- Tell me what to **edit** (e.g., \"add a security section\")\n" +
          "- Say **\"Generate Work Items\"** to create Azure DevOps work items from it"
        ));
      } else {
        handleSummarizeMeetings(send, conversationId).catch(err => console.error('[summarize] Error:', err));
      }
      break;

    case 'generate_work_items':
      if (ctx.stage === 'prd_done' && ctx.prdId) {
        handleGenerateWorkItemsFromContext(send, ctx, conversationId).catch(err => console.error('[genWorkItems] Error:', err));
      } else {
        await send(new MessageActivity("I don't have a PRD to generate work items from yet. Let's start by creating a PRD first — just ask me to summarize your meetings or draft a PRD."));
      }
      break;

    case 'edit_prd':
      if (ctx.stage === 'prd_done' && ctx.prdId) {
        handlePrdEditConversational(send, ctx, cleanText, conversationId).catch(err => console.error('[editPrd] Error:', err));
      } else {
        await send(new MessageActivity("I don't have a PRD to edit yet. Want me to create one? Just say \"let's create a PRD based on our meetings.\""));
      }
      break;

    case 'chat':
    default: {
      if (ctx.stage === 'summary_done' || ctx.stage === 'context_added') {
        ctx.additionalContext.push(cleanText);
        ctx.stage = 'context_added';
        setConversationContext(conversationId, ctx);
        await send(new MessageActivity("Got it, I've noted that additional context. ✅\n\nWhen you're ready, just say **\"let's draft a PRD\"** and I'll incorporate everything."));
        return;
      }

      // Default: AI chat
      const conversationKey = `${activity.conversation.id}/${activity.from.id}`;
      const messages = storage.get(conversationKey) || [];
      try {
        const instructions = fs.readFileSync(path.join(__dirname, "instructions.txt"), 'utf-8').trim();
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
          await send(new MessageActivity(response.content).addAiGenerated().addFeedback());
        } else {
          await prompt.send(activity.text, {
            onChunk: (chunk) => stream.emit(chunk),
          });
          stream.emit(new MessageActivity().addAiGenerated().addFeedback());
        }
        storage.set(conversationKey, messages);
      } catch (error) {
        console.error('[chat] AI error:', error);
        await send(cardMessage(buildErrorCard(formatError(error, 'Failed to generate a response'))));
      }
      break;
    }
  }
});

// ─── Conversational Flow Handlers ───

async function handleRecentMeetingPrd(send, conversationId) {
  try {
    const recentMeeting = DEMO_MEETINGS[DEMO_MEETINGS.length - 1];
    await send(cardMessage(buildProgressCard(`Pulling up your most recent meeting: **${recentMeeting.title}**...`, 1, 3)));

    const { summary } = await generateSummary(recentMeeting.transcript);

    const ctx = getConversationContext(conversationId);
    ctx.stage = 'summary_done';
    ctx.transcript = recentMeeting.transcript;
    ctx.summary = summary;
    ctx.additionalContext = [];
    setConversationContext(conversationId, ctx);

    const response = `📋 **Most Recent Meeting: ${recentMeeting.title}**\n\n---\n\n${summary}\n\n---\n\n💬 **Want me to draft a PRD from this?** Just say **"draft the PRD"** or add any additional context first.`;
    await send(new MessageActivity(response));
    console.log(`[recentMeetingPrd] Summary generated for conversation ${conversationId}`);
  } catch (error) {
    console.error('[recentMeetingPrd] Error:', error);
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to process most recent meeting'))));
  }
}

async function handleSummarizeMeetings(send, conversationId) {
  try {
    await send(cardMessage(buildProgressCard('Pulling up your recent meetings and generating a summary...', 1, 2)));

    const combinedTranscript = getDemoTranscriptsCombined();
    const { summary } = await generateSummary(combinedTranscript);

    const meetingList = DEMO_MEETINGS.map(m => `• **${m.title}**`).join('\n');

    const ctx = getConversationContext(conversationId);
    ctx.stage = 'summary_done';
    ctx.transcript = combinedTranscript;
    ctx.summary = summary;
    ctx.additionalContext = [];
    setConversationContext(conversationId, ctx);

    const response = `📋 **Here's a summary of your recent meetings:**\n\n${meetingList}\n\n---\n\n${summary}\n\n---\n\n💬 **Let me know if I need any more context before creating a PRD.** Anyone on the team can add details here — just reply to this thread. When you're ready, say **"@Cortex let's draft a PRD"**.`;

    await send(new MessageActivity(response));
    console.log(`[summarize] Summary generated for conversation ${conversationId}`);
  } catch (error) {
    console.error('[summarize] Error:', error);
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to summarize meetings'))));
  }
}

async function handleDraftPrd(send, ctx, conversationId) {
  try {
    await send(cardMessage(buildProgressCard('Drafting PRD with all context...', 1, 1)));

    let fullInput = ctx.transcript;
    if (ctx.additionalContext && ctx.additionalContext.length > 0) {
      fullInput += '\n\n--- Additional Context from Team ---\n' + ctx.additionalContext.join('\n\n');
    }

    const { prd } = await generatePRD(fullInput);

    const prdId = `prd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(prdId, prd);

    ctx.stage = 'prd_done';
    ctx.prdId = prdId;
    ctx.prd = prd;
    setConversationContext(conversationId, ctx);

    await send(cardMessage(buildPRDCard(prd, 'Checkout Flow Redesign', prdId)));

    await send(new MessageActivity('📝 **PRD generated!** You can:\n- Reply with edit requests (e.g., "add a security section")\n- Say **"Generate Work Items"** when you\'re ready'));

    console.log(`[draftPrd] PRD generated for conversation ${conversationId}`);
  } catch (error) {
    console.error('[draftPrd] Error:', error);
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to generate PRD'))));
  }
}

async function handleGenerateWorkItemsFromContext(send, ctx, conversationId) {
  try {
    const prd = storage.get(ctx.prdId);
    if (!prd) {
      await send(cardMessage(buildErrorCard('PRD data has expired. Please generate a new PRD.')));
      return;
    }

    await send(cardMessage(buildProgressCard('Generating Azure DevOps work item drafts from PRD...', 1, 2)));

    const { workItems } = await generateWorkItems(prd);

    if (!workItems || workItems.length === 0) {
      await send(cardMessage(buildErrorCard('No work items generated. The PRD may not contain actionable items.')));
      return;
    }

    const workItemsId = `workitems_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(workItemsId, workItems);

    ctx.stage = 'work_items_done';
    ctx.workItemsId = workItemsId;
    setConversationContext(conversationId, ctx);

    await send(cardMessage(buildWorkItemDraftsCard(workItems, workItemsId)));
    console.log(`[genWorkItems] ${workItems.length} work items generated for conversation ${conversationId}`);
  } catch (error) {
    console.error('[genWorkItems] Error:', error);
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to generate Azure DevOps work items'))));
  }
}

async function handlePrdEditConversational(send, ctx, editInstruction, conversationId) {
  try {
    const currentPrd = storage.get(ctx.prdId);
    if (!currentPrd) {
      await send(cardMessage(buildErrorCard('PRD data has expired. Please generate a new PRD.')));
      return;
    }

    await send(cardMessage(buildProgressCard('Applying your edits...', 1, 1)));

    const { prd: updatedPrd } = await editPRD(currentPrd, editInstruction);
    storage.set(ctx.prdId, updatedPrd);

    await send(cardMessage(buildPRDCard(updatedPrd, 'Checkout Flow Redesign', ctx.prdId)));
    console.log(`[editPrd] PRD updated: "${editInstruction.substring(0, 50)}..."`);
  } catch (error) {
    console.error('[editPrd] Error:', error);
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to edit PRD'))));
  }
}

// ─── Legacy/Card-based Handlers ───

async function handlePrdFromText(send, transcript) {
  try {
    await send(cardMessage(buildProgressCard('Analyzing transcript...', 1, 2)));
    const { summary } = await generateSummary(transcript);
    const dataId = `data_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(dataId, { transcript });
    await send(cardMessage(buildSummaryCard(summary, 'Manual Transcript', dataId, 'text')));
  } catch (error) {
    console.error('[prd-from-text] Error:', error);
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to generate summary'))));
  }
}

async function handleConfirmSummary(send, data, activity) {
  try {
    const storedData = storage.get(data.dataId);
    if (!storedData) {
      await send(cardMessage(buildErrorCard('Session expired. Please start again.')));
      return;
    }

    const { transcript, meetingSubject } = storedData;
    const additionalNotes = data.additionalNotes || '';

    await send(cardMessage(buildProgressCard('Generating PRD...', 1, 1)));

    const fullInput = additionalNotes ? `${transcript}\n\n--- Additional Notes ---\n${additionalNotes}` : transcript;
    const { prd } = await generatePRD(fullInput);

    const prdId = `prd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(prdId, prd);

    const conversationId = activity.conversation.id;
    const ctx = getConversationContext(conversationId);
    ctx.stage = 'prd_done';
    ctx.prdId = prdId;
    ctx.prd = prd;
    setConversationContext(conversationId, ctx);

    storage.set(`activePrd_${conversationId}`, { prdId, meetingSubject: meetingSubject || 'Manual Transcript' });

    await send(cardMessage(buildPRDCard(prd, meetingSubject || 'Manual Transcript', prdId)));
  } catch (error) {
    console.error('[confirmSummary] Error:', error);
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to generate PRD'))));
  }
}

async function handleGenerateWorkItems(send, data, activity) {
  try {
    const prd = storage.get(data.prdId);
    if (!prd) {
      await send(cardMessage(buildErrorCard('PRD data expired. Please regenerate.')));
      return;
    }

    if (activity) {
      const conversationId = activity.conversation.id;
      storage.delete(`activePrd_${conversationId}`);
    }

    await send(cardMessage(buildProgressCard('Generating Azure DevOps work item drafts...', 1, 2)));

    const { workItems } = await generateWorkItems(prd);

    if (!workItems || workItems.length === 0) {
      await send(cardMessage(buildErrorCard('No work items generated.')));
      return;
    }

    const workItemsId = `workitems_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storage.set(workItemsId, workItems);

    if (activity) {
      const conversationId = activity.conversation.id;
      const ctx = getConversationContext(conversationId);
      ctx.stage = 'work_items_done';
      ctx.workItemsId = workItemsId;
      setConversationContext(conversationId, ctx);
    }

    await send(cardMessage(buildWorkItemDraftsCard(workItems, workItemsId)));
  } catch (error) {
    console.error('[generateWorkItems] Error:', error);
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to generate work items'))));
  }
}

async function handleShowEditMenu(send, data) {
  try {
    const workItems = storage.get(data.workItemsId);
    if (!workItems) { await send(cardMessage(buildErrorCard('Work item data expired.'))); return; }
    await send(cardMessage(buildEditWorkItemMenuCard(workItems, data.workItemsId)));
  } catch (error) {
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to show edit menu'))));
  }
}

async function handleEditWorkItem(send, data) {
  try {
    const workItems = storage.get(data.workItemsId);
    if (!workItems) { await send(cardMessage(buildErrorCard('Work item data expired.'))); return; }
    if (data.workItemIndex < 0 || data.workItemIndex >= workItems.length) { await send(cardMessage(buildErrorCard('Invalid work item index.'))); return; }
    await send(cardMessage(buildEditWorkItemCard(workItems[data.workItemIndex], data.workItemIndex, data.workItemsId)));
  } catch (error) {
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to load work item'))));
  }
}

async function handleSaveWorkItemEdit(send, data) {
  try {
    const workItems = storage.get(data.workItemsId);
    if (!workItems) { await send(cardMessage(buildErrorCard('Work item data expired.'))); return; }

    const wi = workItems[data.workItemIndex];
    if (data.editTitle) wi.title = data.editTitle;
    if (data.editDescription !== undefined) wi.description = data.editDescription;
    if (data.editPriority) wi.priority = parseInt(data.editPriority, 10);
    if (data.editType) wi.workItemType = data.editType;
    if (data.editTags !== undefined) wi.tags = data.editTags;

    storage.set(data.workItemsId, workItems);
    await send(cardMessage(buildWorkItemDraftsCard(workItems, data.workItemsId)));
  } catch (error) {
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to save work item'))));
  }
}

async function handleCancelWorkItemEdit(send, data) {
  try {
    const workItems = storage.get(data.workItemsId);
    if (!workItems) { await send(cardMessage(buildErrorCard('Work item data expired.'))); return; }
    await send(cardMessage(buildWorkItemDraftsCard(workItems, data.workItemsId)));
  } catch (error) {
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to return to drafts'))));
  }
}

async function handleSubmitSelectedToAdo(send, data) {
  try {
    const allWorkItems = storage.get(data.workItemsId);
    if (!allWorkItems) { await send(cardMessage(buildErrorCard('Work item data expired.'))); return; }

    const selectedWorkItems = allWorkItems.filter((_, i) => data[`include_${i}`] !== 'false');
    if (selectedWorkItems.length === 0) {
      await send(cardMessage(buildErrorCard('No work items selected.')));
      return;
    }

    await send(cardMessage(buildProgressCard(`Submitting ${selectedWorkItems.length} of ${allWorkItems.length} work items to Azure DevOps...`, 1, 1)));
    const results = await submitToAdo(selectedWorkItems);
    await send(cardMessage(buildAdoResultCard(results)));
  } catch (error) {
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to submit to Azure DevOps'))));
  }
}

async function handleSubmitToAdo(send, data) {
  try {
    const workItems = storage.get(data.workItemsId);
    if (!workItems) { await send(cardMessage(buildErrorCard('Work item data expired.'))); return; }
    await send(cardMessage(buildProgressCard('Submitting work items to Azure DevOps...', 1, 1)));
    const results = await submitToAdo(workItems);
    await send(cardMessage(buildAdoResultCard(results)));
  } catch (error) {
    await send(cardMessage(buildErrorCard(formatError(error, 'Failed to submit to Azure DevOps'))));
  }
}

// ─── Feedback Handler ───
app.on('message.submit.feedback', async ({ activity }) => {
  console.log("Feedback received:", JSON.stringify(activity.value));
});

module.exports = app;
