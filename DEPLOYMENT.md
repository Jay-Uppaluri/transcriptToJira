# Deployment Guide — Cortex

## Azure Web App

- **App name:** `cortex-prd-app`
- **Resource group:** `cortex-rg`
- **Plan:** `ASP-TypingBowl-accc` (P0v3, Central US)
- **Runtime:** Node 20 LTS (Linux)
- **URL:** https://cortex-prd-app.azurewebsites.net/

## Deploy

From the repo root:

```bash
az webapp up --name cortex-prd-app --resource-group cortex-rg --runtime "NODE:20-lts" --plan ASP-TypingBowl-accc
```

That's it. This zips the code, uploads it, builds (runs `npm install` + `npm run build` via Oryx), and restarts the app.

## What happens during deploy

1. Azure zips your local directory (excludes `.git`, `node_modules`)
2. Oryx build system runs `npm install` and the `POST_BUILD_COMMAND` (`npm run build`)
3. Container restarts with `node server.js`

## App Settings

Configured via Azure (not in code):

| Setting | Description |
|---------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for transcript analysis |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_USER_EMAIL` | Jira account email |
| `JIRA_BASE_URL` | Jira instance URL |
| `JIRA_PROJECT_KEY` | Jira project key (e.g. KAN) |
| `JWT_SECRET` | JWT signing secret |
| `TOKEN_ENCRYPTION_KEY` | Encryption key for stored tokens |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` — enables Oryx build |
| `POST_BUILD_COMMAND` | `npm run build` — runs Vite build |

To view current settings:
```bash
az webapp config appsettings list --name cortex-prd-app --resource-group cortex-rg -o table
```

## Startup Command

```
node server.js
```

**Do NOT use `npm install && node server.js`** — `npm install` at startup hits the 230s container timeout. Dependencies are installed during the build phase.

## Troubleshooting

### Stuck deployment (409 error)
If you get "Another deployment is in progress":

1. Check status: `az webapp show --name cortex-prd-app --resource-group cortex-rg --query state`
2. Restart: `az webapp restart --name cortex-prd-app --resource-group cortex-rg`
3. If still stuck, delete the lock file via Kudu VFS API:
   ```bash
   TOKEN=$(az account get-access-token --resource "https://management.azure.com/" --query "accessToken" -o tsv)
   curl -X DELETE -H "Authorization: Bearer $TOKEN" -H "If-Match: *" \
     "https://cortex-prd-app.scm.azurewebsites.net/api/vfs/site/deployments/pending"
   ```

### Check logs
```bash
az webapp log tail --name cortex-prd-app --resource-group cortex-rg
```

### Container timeout
If the container fails to start within 230s, check the startup command is just `node server.js` (not `npm install && node server.js`).
