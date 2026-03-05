# Teams Bot Setup — What's Done & What You Need To Do

## ✅ Done (by Jarvis)

### 1. Azure Bot Service Created
- **Name:** `cortex-prd-bot`
- **Resource Group:** `cortex-rg`
- **App ID:** `2075b241-0c2e-4233-a91f-29f5951c38e8`
- **Type:** SingleTenant
- **Messaging Endpoint:** `https://cortex-prd-app.azurewebsites.net/api/messages`

### 2. Teams Channel Enabled
- Microsoft Teams channel is active on the bot registration

### 3. Bot Integrated into Web Server
- `server.js` now loads the Teams bot (`bot/src/app/app.js`) and proxies `/api/messages` to it
- Both web UI and Teams bot run on the same Azure App Service
- Deployed to Azure — the `/api/messages` endpoint responds (returns `unauthorized` to unauthenticated requests, which is correct)

### 4. App Settings Configured
- `CLIENT_ID`, `TENANT_ID`, `BOT_TYPE`, `CLIENT_SECRET` all set in Azure App Settings
- Plus existing: `OPENAI_API_KEY`, `JIRA_*`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`

### 5. App Manifest Updated
- `appPackage/manifest.json` — hardcoded bot ID, proper names/descriptions
- Commands: `/generate-prd` and `/prd-from-text`
- Built zip at: `appPackage/build/cortex-teams-app.zip`

### 6. Code Deployed
- Latest code deployed via `az webapp up`
- Site is live at https://cortex-prd-app.azurewebsites.net

---

## 🔧 What YOU Need To Do (requires human/admin access)

### Step 1: Upload the Teams App to Your Organization
You need Teams Admin access or developer sideloading permissions.

**Option A — Sideload (for testing/dev):**
1. Open Microsoft Teams
2. Go to **Apps** → **Manage your apps** → **Upload an app**
3. Click **Upload a custom app**
4. Select: `appPackage/build/cortex-teams-app.zip`
5. Click **Add** to install it

**Option B — Admin publish (for the whole org):**
1. Go to [Teams Admin Center](https://admin.teams.microsoft.com)
2. **Teams apps** → **Manage apps** → **Upload new app**
3. Upload `cortex-teams-app.zip`
4. Approve it for your org

### Step 2: Grant Microsoft Graph Permissions (for `/generate-prd` with meeting URLs)
The bot needs Graph API permissions to fetch meeting transcripts. In the [Azure Portal](https://portal.azure.com):

1. Go to **Azure Active Directory** → **App registrations** → find `2075b241-0c2e-4233-a91f-29f5951c38e8`
2. **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions**
3. Add these permissions:
   - `OnlineMeetings.Read.All`
   - `OnlineMeetingTranscript.Read.All`
4. Click **Grant admin consent**

> **Note:** The `/prd-from-text` command works WITHOUT Graph permissions (user just pastes the transcript text). So you can test immediately even before setting up Graph.

### Step 3: Test It
1. Open Teams, find the "Cortex" bot
2. Send: `/prd-from-text [paste a meeting transcript]`
3. It should generate a PRD and show an Adaptive Card with "Generate Jira Tickets" button

---

## Architecture

```
Teams User → Microsoft Bot Framework → https://cortex-prd-app.azurewebsites.net/api/messages
                                                    ↓
                                            server.js (Express)
                                                    ↓
                                          bot/src/app/app.js (Teams SDK)
                                                    ↓
                                          shared/prdService.cjs (OpenAI)
                                          shared/ticketService.cjs (Jira)
```

Both the web UI (React frontend) and the Teams bot share the same backend services.

## No Credit Card Needed
Everything is running on your existing Azure Pay-As-You-Go subscription. The Bot Service is on the F0 (free) tier. The App Service was already provisioned on the P0v3 plan.
