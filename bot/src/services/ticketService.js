const { generateTickets, submitToJira, buildJiraAuthFromEnv } = require('../../../shared/ticketService.cjs');
const config = require('../config');

/**
 * Generate Jira tickets from a PRD.
 * Delegates to shared service.
 */
async function generateTicketsFromPRD(prd, projectKey) {
  return generateTickets(prd, projectKey || config.jiraProjectKey, config.openAIKey);
}

/**
 * Submit tickets to Jira.
 * Delegates to shared service using env var auth.
 */
async function submitTicketsToJira(tickets) {
  const auth = buildJiraAuthFromEnv();
  // Override project key from config
  for (const ticket of tickets) {
    if (ticket.fields) {
      ticket.fields.project = { key: config.jiraProjectKey };
    }
  }
  return submitToJira(tickets, auth);
}

module.exports = { generateTickets: generateTicketsFromPRD, submitToJira: submitTicketsToJira };
