/**
 * Unified Ticket Provider Service for the Teams Bot
 *
 * Delegates to the shared ticketProvider abstraction layer.
 * Provides a consistent API regardless of whether Jira or ADO is active.
 */
const { generateTickets: providerGenerate, submitTickets: providerSubmit, buildAuthFromEnv, getProviderInfo } = require('../../../shared/ticketProvider.cjs');
const config = require('../config');

/**
 * Generate tickets/work items from a PRD.
 */
async function generateTickets(prd, projectKey) {
  return providerGenerate(prd, projectKey, config.openAIKey);
}

/**
 * Submit tickets/work items using env-var auth.
 */
async function submitTickets(items) {
  const auth = buildAuthFromEnv();
  return providerSubmit(items, auth);
}

module.exports = { generateTickets, submitTickets, getProviderInfo };
