const { generatePRD, generateSummary, editPRD, countWords, LONG_TRANSCRIPT_THRESHOLD } = require('../../../shared/prdService.cjs');
const config = require('../config');

/**
 * Generate a PRD from a meeting transcript.
 * Delegates to shared service. Supports onProgress callback for long transcripts.
 * @param {string} transcript
 * @param {object} [options] - { onProgress: (progress) => void }
 */
async function generatePRDFromTranscript(transcript, options = {}) {
  return generatePRD(transcript, config.openAIKey, options);
}

/**
 * Generate a concise summary from a meeting transcript.
 * Delegates to shared service. Supports onProgress callback.
 * @param {string} transcript
 * @param {object} [options] - { onProgress: (progress) => void }
 */
async function generateSummaryFromTranscript(transcript, options = {}) {
  return generateSummary(transcript, config.openAIKey, options);
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
  countWords,
  LONG_TRANSCRIPT_THRESHOLD,
};
