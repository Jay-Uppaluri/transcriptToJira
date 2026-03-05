const { generatePRD } = require('../../../shared/prdService.cjs');
const config = require('../config');

/**
 * Generate a PRD from a meeting transcript.
 * Delegates to shared service.
 */
async function generatePRDFromTranscript(transcript) {
  return generatePRD(transcript, config.openAIKey);
}

module.exports = { generatePRD: generatePRDFromTranscript };
