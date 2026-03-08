const { generatePRD, generateSummary, editPRD } = require('../../../shared/prdService.cjs');
const config = require('../config');

/**
 * Generate a PRD from a meeting transcript.
 * Delegates to shared service.
 */
async function generatePRDFromTranscript(transcript) {
  return generatePRD(transcript, config.openAIKey);
}

/**
 * Generate a concise summary from a meeting transcript.
 * Delegates to shared service.
 */
async function generateSummaryFromTranscript(transcript) {
  return generateSummary(transcript, config.openAIKey);
}

/**
 * Apply a natural language edit to an existing PRD.
 * Delegates to shared service.
 */
async function editPRDContent(currentPrd, editInstruction) {
  return editPRD(currentPrd, editInstruction, config.openAIKey);
}

module.exports = {
  generatePRD: generatePRDFromTranscript,
  generateSummary: generateSummaryFromTranscript,
  editPRD: editPRDContent,
};
