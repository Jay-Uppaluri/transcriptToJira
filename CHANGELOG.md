# Changelog (ado branch)

## 2026-03-10
### Changed
- **Azure DevOps integration** — replaces Jira as the ticket backend
  - New `shared/adoService.cjs` with ADO REST API v7.1 work item creation
  - Supports Epics, Features, User Stories, Tasks, and Bugs
  - Parent-child linking via `parentIndex` in generated work items
  - New `shared/prompts/adoTicketPrompt.txt` for GPT-4o work item generation
  - New `bot/src/services/adoTicketService.js` bot-level wrapper
  - Updated `bot/src/services/adaptiveCards.js` — ADO-appropriate fields, icons, and labels
  - Updated `bot/src/app/app.js` — all Jira handlers replaced with ADO equivalents
  - Updated `bot/src/config.js` — reads `ADO_ORG_URL`, `ADO_PROJECT`, `ADO_PAT` env vars
  - Conversational flow unchanged — only the ticket backend is different

# Changelog (demo branch)

## 2024-03-09
### Fixed
- Ticket card borders: each ticket now wrapped in an `emphasis` container with rounded corners for visual separation
- Title and description alignment: description moved inside the same column as the title so both are perfectly left-aligned under the checkbox row

### Added
- `CHANGELOG.md` to track demo branch changes

## Previous changes (demo branch)
- **Initial demo flow** — conversational @mention bot with hardcoded meetings
- **Full-width cards** — `msteams: { width: 'Full' }` on all Adaptive Cards
- **Thread auto-reply** — bot replies in threads without requiring @mention
- **Ticket card layout** — title + priority on same row, description row below
