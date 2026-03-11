const { generateWorkItems, submitToAdo, buildAdoAuthFromEnv } = require('../../../shared/adoService.cjs');
const config = require('../config');

/**
 * Generate ADO work items from a PRD.
 * Delegates to shared service.
 */
async function generateWorkItemsFromPRD(prd) {
  return generateWorkItems(prd, config.openAIKey);
}

/**
 * Submit work items to Azure DevOps.
 * Delegates to shared service using env var auth.
 */
async function submitWorkItemsToAdo(workItems) {
  const auth = buildAdoAuthFromEnv();
  return submitToAdo(workItems, auth);
}

module.exports = { generateWorkItems: generateWorkItemsFromPRD, submitToAdo: submitWorkItemsToAdo };
