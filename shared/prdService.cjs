const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const prdPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/prdPrompt.txt'),
  'utf-8'
).trim();

const summaryPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/summaryPrompt.txt'),
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

/**
 * Generate a concise meeting summary from a transcript using GPT-4o.
 * @param {string} transcript - The parsed meeting transcript text
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ summary: string }>}
 */
async function generateSummary(transcript, apiKey) {
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    messages: [
      { role: 'system', content: summaryPrompt },
      { role: 'user', content: `Here is the Teams meeting transcript:\n\n${transcript}` },
    ],
  });

  const summary = completion.choices[0].message.content;
  return { summary };
}

/**
 * Apply a natural language edit to an existing PRD using GPT-4o.
 * @param {string} currentPrd - The current PRD content
 * @param {string} editInstruction - The user's edit request
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ prd: string, title: string }>}
 */
async function editPRD(currentPrd, editInstruction, apiKey) {
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: 'You are a senior product manager editing a PRD. Apply the user\'s requested change to the PRD below. Return the complete updated PRD in the same markdown format. Do not explain what you changed — just return the full updated PRD.',
      },
      { role: 'user', content: `Current PRD:\n\n${currentPrd}\n\n---\n\nRequested edit: ${editInstruction}` },
    ],
  });

  const prd = completion.choices[0].message.content;
  const titleMatch = prd.match(/^#\s+(?:\*\*)?(.+?)(?:\*\*)?$/m);
  const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : 'Untitled PRD';

  return { prd, title };
}

module.exports = { generatePRD, generateSummary, editPRD };
