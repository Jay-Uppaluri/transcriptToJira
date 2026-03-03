# Cortex

Cortex turns meeting transcripts into structured PRDs (Product Requirements Documents) and Jira tickets using OpenAI. Paste a Microsoft Teams transcript, get an editable PRD with inline commenting, then generate and submit Jira tickets — all from one interface.

## Prerequisites

- **Node.js** v18+
- **npm**
- **OpenAI API key** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Atlassian OAuth app** (for Jira integration) — [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
OPENAI_API_KEY=sk-...

# Required for Jira OAuth
ATLASSIAN_CLIENT_ID=your-client-id
ATLASSIAN_CLIENT_SECRET=your-client-secret
ATLASSIAN_CALLBACK_URL=http://localhost:5173/auth/callback

# Required — generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_ENCRYPTION_KEY=your-generated-hex-key
```

### 3. Set up Atlassian OAuth

1. Go to [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/) and create a new OAuth 2.0 app.
2. Under **Authorization**, add the callback URL: `http://localhost:5173/auth/callback`
3. Under **Permissions**, add these scopes:
   - `read:jira-work`
   - `write:jira-work`
   - `read:jira-user`
   - `offline_access`
4. Copy the **Client ID** and **Client Secret** into your `.env`.

## Running

Start both the API server and the Vite dev server:

```bash
# Terminal 1 — API server (port 3010)
node server.js

# Terminal 2 — Frontend dev server (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

The Vite dev server proxies `/api` and `/auth` requests to the API server on port 3010.

## Usage

1. **Sign up / Log in** — Create an account (email, password, name, job title).
2. **Connect Jira** — Click "Connect to Jira" in the header to link your Atlassian account via OAuth.
3. **Create a PRD** — Click "New PRD", paste a meeting transcript, and hit Generate. OpenAI produces a structured PRD.
4. **Review & Comment** — Edit the PRD inline. Highlight text to leave comments or suggestions. Reply to and resolve comments.
5. **Generate Tickets** — Click "Generate Tickets" to break the PRD into Jira-formatted tickets (Epics, Stories, Tasks).
6. **Submit to Jira** — Review the tickets and submit them directly to your connected Jira project.

### Test Mode

Toggle **Test Mode** in the header to skip OpenAI API calls and use sample data. Useful for trying out the UI without burning API credits.

## Project Structure

```
├── server.js              # Express API server (auth, PRD CRUD, OpenAI, Jira)
├── server/
│   ├── db.js              # SQLite database setup and queries
│   ├── jiraAuth.js        # Atlassian OAuth 2.0 flow
│   ├── crypto.js          # Token encryption/decryption
│   └── testData.js        # Sample PRD and tickets for test mode
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── src/
│   ├── App.jsx            # Main app component and routing
│   ├── components/        # React UI components
│   ├── hooks/             # Custom React hooks
│   └── utils/             # API helpers
├── .env.example           # Environment variable template
├── vite.config.js         # Vite config with API proxy
├── tailwind.config.js     # Tailwind CSS config
└── package.json
```

## Tech Stack

- **Frontend:** React 19, Tailwind CSS, Lucide icons, react-markdown
- **Backend:** Express 5, better-sqlite3, OpenAI SDK
- **Auth:** JWT (user accounts) + Atlassian OAuth 2.0 (Jira)
- **Build:** Vite 7

## Production Build

```bash
npm run build
```

Static files are output to `dist/`. Serve them with any static file server, pointing API routes to the Express backend on port 3010.
