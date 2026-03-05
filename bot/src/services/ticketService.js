const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const openai = new OpenAI({ apiKey: config.openAIKey });

const ticketPromptTemplate = fs.readFileSync(
  path.join(__dirname, '../prompts/ticketPrompt.txt'),
  'utf-8'
).trim();

/**
 * Generate Jira tickets from a PRD using GPT-4o.
 * Returns { tickets: Array }
 */
async function generateTickets(prd, projectKey) {
  const key = projectKey || config.jiraProjectKey;
  const ticketPrompt = ticketPromptTemplate.replace('{{PROJECT_KEY}}', key);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    messages: [
      { role: 'system', content: ticketPrompt },
      { role: 'user', content: `Here is the PRD:\n\n${prd}` },
    ],
  });

  let content = completion.choices[0].message.content;
  // Strip markdown code fences if present
  content = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
  const tickets = JSON.parse(content);
  return { tickets };
}

/**
 * Submit tickets to Jira REST API v3.
 * Returns { created, failed, total, results }
 */
async function submitToJira(tickets) {
  const { jiraBaseUrl, jiraUserEmail, jiraApiToken, jiraProjectKey } = config;

  if (!jiraBaseUrl || !jiraUserEmail || !jiraApiToken) {
    throw new Error('Jira credentials not configured. Set JIRA_BASE_URL, JIRA_USER_EMAIL, and JIRA_API_TOKEN environment variables.');
  }

  const authHeader = `Basic ${Buffer.from(`${jiraUserEmail}:${jiraApiToken}`).toString('base64')}`;
  const results = [];

  for (const ticket of tickets) {
    if (ticket.fields) {
      ticket.fields.project = { key: jiraProjectKey };
    }

    try {
      const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(ticket),
      });
      const data = await response.json();
      results.push({
        success: response.ok,
        status: response.status,
        data,
        summary: ticket.fields?.summary || 'Unknown',
      });
    } catch (err) {
      results.push({
        success: false,
        error: err.message,
        summary: ticket.fields?.summary || 'Unknown',
      });
    }
  }

  const created = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  return { created, failed, total: tickets.length, results };
}

module.exports = { generateTickets, submitToJira };