const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const prdPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/prdPrompt.txt'),
  'utf-8'
).trim();

/**
 * Generate a PRD from a meeting transcript using GPT-4o.
 * @param {string} transcript - The parsed meeting transcript text
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ prd: string, title: string }>}
 */
async function generatePRD(transcript, apiKey) {
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role: 'system', content: prdPrompt },
      { role: 'user', content: `Here is the Teams meeting transcript:\n\n${transcript}` },
    ],
  });

  const prd = completion.choices[0].message.content;

  // Extract title from PRD (first heading or first line)
  const titleMatch = prd.match(/^#\s+(?:\*\*)?(.+?)(?:\*\*)?$/m);
  const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : 'Untitled PRD';

  return { prd, title };
}

module.exports = { generatePRD };
