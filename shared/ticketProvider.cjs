/**
 * Ticket Provider Abstraction Layer
 *
 * Provides a unified interface for ticket/work-item backends (Jira vs Azure DevOps).
 * The active provider is determined by the TICKET_PROVIDER env var ('jira' | 'ado').
 * Default: 'ado'
 *
 * Usage:
 *   const { generateTickets, submitTickets, buildAuthFromEnv, getProviderInfo } = require('./ticketProvider.cjs');
 */

const PROVIDER = (process.env.TICKET_PROVIDER || 'ado').toLowerCase();

// Provider metadata
const PROVIDER_INFO = {
  jira: {
    name: 'jira',
    displayName: 'Jira',
    icon: '/icons/jira.png',
    itemLabel: 'Ticket',
    itemLabelPlural: 'Tickets',
  },
  ado: {
    name: 'ado',
    displayName: 'Azure DevOps',
    icon: '/icons/ado.png',
    itemLabel: 'Work Item',
    itemLabelPlural: 'Work Items',
  },
};

/**
 * Get metadata about the active provider.
 * @returns {{ name: string, displayName: string, icon: string, itemLabel: string, itemLabelPlural: string }}
 */
function getProviderInfo() {
  return PROVIDER_INFO[PROVIDER] || PROVIDER_INFO.ado;
}

/**
 * Generate tickets/work items from a PRD.
 * @param {string} prd - The PRD content
 * @param {string} projectKey - Project key (used by Jira; ignored by ADO)
 * @param {string} openAIKey - OpenAI API key
 * @returns {Promise<{ tickets?: Array, workItems?: Array }>}
 */
async function generateTickets(prd, projectKey, openAIKey) {
  if (PROVIDER === 'jira') {
    const { generateTickets: gen } = require('./ticketService.cjs');
    return gen(prd, projectKey, openAIKey);
  }
  const { generateWorkItems } = require('./adoService.cjs');
  return generateWorkItems(prd, openAIKey);
}

/**
 * Submit tickets/work items to the configured backend.
 * @param {Array} items - Array of ticket or work-item objects
 * @param {object} auth - Provider-specific auth config (from buildAuthFromEnv or OAuth)
 * @returns {Promise<{ created: number, failed: number, total: number, results: Array }>}
 */
async function submitTickets(items, auth) {
  if (PROVIDER === 'jira') {
    const { submitToJira } = require('./ticketService.cjs');
    return submitToJira(items, auth);
  }
  const { submitToAdo } = require('./adoService.cjs');
  return submitToAdo(items, auth);
}

/**
 * Build auth config from environment variables for the active provider.
 * @returns {object} Provider-specific auth config
 */
function buildAuthFromEnv() {
  if (PROVIDER === 'jira') {
    const { buildJiraAuthFromEnv } = require('./ticketService.cjs');
    return buildJiraAuthFromEnv();
  }
  const { buildAdoAuthFromEnv } = require('./adoService.cjs');
  return buildAdoAuthFromEnv();
}

module.exports = { generateTickets, submitTickets, buildAuthFromEnv, getProviderInfo, PROVIDER };
