# Cortex

**Teams transcript in → Azure DevOps work items out.**

Cortex is a Microsoft Teams bot that turns meeting transcripts into structured PRDs and Azure DevOps work items using AI. Drop a Teams meeting URL or paste a transcript in chat, and Cortex extracts the discussion, generates an editable PRD, breaks it into properly typed and hierarchically linked ADO work items (Epics → Issues → Tasks), and submits them — all without leaving Teams.

## What It Actually Does

```
Teams Meeting URL ──→ Graph API fetches VTT transcript
                         │
                    Parse & chunk long transcripts (map-reduce)
                         │
                    GPT-4o summarizes → generates PRD
                         │
                    Team reviews, comments, edits PRD in chat
                         │
                    GPT-4o breaks PRD into ADO work items
                         │
                    Deduplicates, validates, retries failed items
                         │
                    Submits to Azure DevOps via REST API ──→ Linked work items in your board
```

### The Hard Parts

This isn't a simple "send text to GPT and paste the result" tool. The pipeline handles real-world complexity:

- **Long transcript chunking** — Meetings over ~8,000 words get split into semantic chunks (respecting speaker changes, topic shifts, and pauses), summarized in parallel, then merged back together. Overlap between chunks preserves context continuity.
- **Duplicate activity suppression** — Teams sends duplicate webhook events constantly. A TTL-based dedup layer (activity ID + action key tracking) prevents double-processing of messages and card actions.
- **Parent-child work item linking** — Work items are submitted sequentially so that Epics are created first, then child Issues/Tasks reference the parent's newly created ADO ID. If a parent link fails, the item is retried without the link rather than lost.
- **Graceful degradation on ADO submission** — If a work item type doesn't exist in the target project, or fields are rejected, Cortex retries with minimal fields. Issue type fallbacks and field sanitization handle mismatches between what GPT generates and what the project actually supports.
- **Meeting URL resolution** — Teams `/meet/` short URLs don't match the Graph API's stored `JoinWebUrl`. Cortex extracts the meeting code and falls back to listing recent meetings per-user to find a match. It tries the URL organizer first, then iterates tenant users, with proper handling for Application Access Policy propagation delays (403s that resolve after ~30 minutes).
- **VTT parsing** — Raw VTT transcript content comes back as strings, Buffers, ReadableStreams, or ArrayBuffers depending on the Graph SDK version. All formats are handled. Speaker tags (`<v SpeakerName>`) are extracted and consolidated.
- **Conversational state machine** — The bot tracks conversation stage (`idle → summary_done → context_added → prd_done → work_items_done`) so team members can add context, request edits, and generate work items across multiple messages without re-providing the transcript.
- **Provider abstraction** — A unified `ticketProvider` layer supports both Jira and Azure DevOps. Switching backends is a single env var (`TICKET_PROVIDER=ado|jira`).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Microsoft Teams                                        │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ @Cortex  │  │ Adaptive Cards   │  │ Card Actions  │ │
│  │ messages │  │ (PRD, drafts,    │  │ (edit, submit,│ │
│  │          │  │  results)        │  │  select)      │ │
│  └────┬─────┘  └────────▲─────────┘  └──────┬────────┘ │
└───────┼────────────────────────────────────────┼────────┘
        │                                       │
┌───────▼───────────────────────────────────────▼─────────┐
│  Bot Framework (Teams AI SDK)                           │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Dedup Layer │  │ Intent   │  │ Conversation State │ │
│  │ (activity + │  │ Detector │  │ Machine            │ │
│  │  action)    │  │          │  │                    │ │
│  └─────────────┘  └──────────┘  └────────────────────┘ │
└─────────────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌──────────────┐ ┌────────────────────┐
│ Graph API     │ │ GPT-4o       │ │ Azure DevOps API   │
│               │ │              │ │                    │
│ • Meeting     │ │ • Chunk      │ │ • Create work      │
│   lookup      │ │   summaries  │ │   items (PATCH)    │
│ • Transcript  │ │ • PRD gen    │ │ • Parent-child     │
│   download    │ │ • Work item  │ │   linking          │
│ • VTT parse   │ │   generation │ │ • Retry + fallback │
│ • User        │ │ • PRD edits  │ │                    │
│   resolution  │ │              │ │                    │
└───────────────┘ └──────────────┘ └────────────────────┘
```

There's also a **web app** (React + Express) for the same pipeline outside of Teams — upload transcripts, review PRDs with inline commenting, generate and submit work items via browser.

## Prerequisites

- **Node.js** v18+
- **OpenAI API key** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Azure DevOps** PAT with work item read/write scope
- **Microsoft Entra app registration** (for Teams bot + Graph API transcript access)

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Key variables:

```env
# AI
OPENAI_API_KEY=sk-...

# Azure DevOps (default backend)
TICKET_PROVIDER=ado
ADO_ORG_URL=https://dev.azure.com/your-org
ADO_PROJECT=YourProject
ADO_PAT=your-personal-access-token

# Jira (alternative backend)
# TICKET_PROVIDER=jira
# JIRA_BASE_URL=https://your-domain.atlassian.net
# JIRA_USER_EMAIL=you@example.com
# JIRA_API_TOKEN=your-api-token

# Teams Bot (for bot deployment)
CLIENT_ID=your-entra-app-id
TENANT_ID=your-tenant-id
CLIENT_SECRET=your-client-secret

# Web App Auth
JWT_SECRET=generate-a-random-hex-string
TOKEN_ENCRYPTION_KEY=generate-another-random-hex-string
```

### 3. Run

```bash
# API server (port 3010)
node server.js

# Frontend dev server (port 5173)
npm run dev
```

For the Teams bot, see [TEAMS_BOT_SETUP.md](TEAMS_BOT_SETUP.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

## Usage

### Teams Bot

1. **@Cortex** in a channel or DM
2. Ask it to summarize recent meetings or paste a transcript
3. Team members can add context by replying in the thread
4. Say "draft a PRD" — Cortex generates a structured PRD as an Adaptive Card
5. Request edits conversationally ("add a security section", "remove the BNPL scope")
6. Say "generate work items" — Cortex breaks the PRD into typed ADO work items
7. Review the drafts, edit individual items, toggle which to include
8. Submit → work items appear in your Azure DevOps board with proper hierarchy

### Web App

1. Sign up → connect your ticket provider (Jira or ADO)
2. Upload a `.vtt` transcript or paste text
3. Review the AI-generated PRD with inline commenting
4. Generate tickets/work items and submit

## Project Structure

```
├── bot/                        # Teams bot
│   └── src/
│       ├── app/app.js          # Message handler, intent detection, conversation state
│       ├── services/
│       │   ├── adaptiveCards.js # All Adaptive Card builders
│       │   ├── adoTicketService.js
│       │   ├── graphService.js  # Graph API: meeting lookup, transcript fetch, VTT parse
│       │   ├── prdService.js    # PRD generation (bot-level wrapper)
│       │   └── ticketProviderService.js
│       └── prompts/             # GPT-4o system prompts (bot-specific)
├── shared/                     # Shared between bot and web app
│   ├── adoService.cjs          # ADO REST API: work item creation, retry, linking
│   ├── ticketService.cjs       # Jira REST API: issue creation, sanitization, retry
│   ├── ticketProvider.cjs      # Provider abstraction layer (ado|jira)
│   ├── prdService.cjs          # PRD generation with map-reduce for long transcripts
│   ├── transcriptChunker.cjs   # Semantic chunking: speaker changes, topic shifts, pauses
│   └── prompts/                # GPT-4o system prompts
│       ├── adoTicketPrompt.txt  # ADO work item generation prompt
│       ├── ticketPrompt.txt     # Jira ticket generation prompt
│       ├── prdPrompt.txt        # PRD generation prompt
│       ├── chunkSummaryPrompt.txt
│       ├── mergeSummaryPrompt.txt
│       └── summaryPrompt.txt
├── server.js                   # Express API (auth, PRD CRUD, OpenAI, ticket submission)
├── server/                     # Server modules (DB, auth, crypto)
├── src/                        # React frontend (web app)
├── appPackage/                 # Teams app manifest
├── infra/                      # Azure Bicep templates
└── middleware/                 # JWT auth middleware
```

## Tech Stack

- **Bot:** Microsoft Teams AI SDK, Bot Framework, Adaptive Cards
- **AI:** OpenAI GPT-4o (summarization, PRD generation, work item decomposition)
- **Integrations:** Microsoft Graph API (transcripts), Azure DevOps REST API, Jira REST API
- **Frontend:** React 19, Tailwind CSS, Vite 7
- **Backend:** Express 5, better-sqlite3
- **Auth:** JWT (web app) + Entra ID (Teams bot) + Atlassian OAuth 2.0 (Jira)
- **Infra:** Azure Web App, Azure Bot Service

## Production

```bash
npm run build    # Vite builds to dist/
node server.js   # Serves API + static files
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for Azure Web App deployment.
