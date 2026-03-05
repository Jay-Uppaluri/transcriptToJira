const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const openai = new OpenAI({ apiKey: config.openAIKey });

const prdPrompt = fs.readFileSync(
  path.join(__dirname, '../prompts/prdPrompt.txt'),
  'utf-8'
).trim();

/**
 * Generate a PRD from a meeting transcript using GPT-4o.
 * Returns { prd: string }
 */
async function generatePRD(transcript) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role: 'system', content: prdPrompt },
      { role: 'user', content: `Here is the Teams meeting transcript:\n\n${transcript}` },
    ],
  });

  return { prd: completion.choices[0].message.content };
}

module.exports = { generatePRD };