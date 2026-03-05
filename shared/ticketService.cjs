const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const ticketPromptTemplate = fs.readFileSync(
  path.join(__dirname, 'prompts/ticketPrompt.txt'),
  'utf-8'
).trim();

/**
 * Generate Jira tickets from a PRD using GPT-4o.
 * @param {string} prd - The PRD content
 * @param {string} projectKey - Jira project key (e.g. 'KAN')
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ tickets: Array }>}
 */
async function generateTickets(prd, projectKey, apiKey) {
  const openai = new OpenAI({ apiKey });
  const ticketPrompt = ticketPromptTemplate.replace('{{PROJECT_KEY}}', projectKey || 'PROJ');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    messages: [
      { role: 'system', content: ticketPrompt },
      { role: 'user', content: `Here is the PRD:\n\n${prd}` },
    ],
  });

  let content = completion.choices[0].message.content;
  content = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
  const tickets = JSON.parse(content);
  return { tickets };
}

/**
 * Submit tickets to Jira REST API v3.
 * @param {Array} tickets - Array of Jira ticket objects
 * @param {{ authHeader: string, baseUrl: string, siteUrl?: string }} auth - Jira auth config
 * @returns {Promise<{ created: number, failed: number, total: number, results: Array, siteUrl: string }>}
 */
async function submitToJira(tickets, auth) {
  const { authHeader, baseUrl, siteUrl } = auth;
  const results = [];

  for (const ticket of tickets) {
    try {
      const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(ticket),
      });
      const data = await response.json();

      if (response.ok) {
        results.push({ success: true, status: response.status, data, summary: ticket.fields?.summary });
      } else {
        // Parse Jira error response into a human-readable message
        const errorMessages = [];
        if (data.errorMessages?.length) errorMessages.push(...data.errorMessages);
        if (data.errors) {
          for (const [field, msg] of Object.entries(data.errors)) {
            errorMessages.push(`${field}: ${msg}`);
          }
        }
        if (data.message) errorMessages.push(data.message);
        const errorDetail = errorMessages.length ? errorMessages.join('; ') : `HTTP ${response.status}`;
        results.push({ success: false, status: response.status, error: errorDetail, data, summary: ticket.fields?.summary });
      }
    } catch (err) {
      results.push({ success: false, error: err.message, summary: ticket.fields?.summary });
    }
  }

  const created = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  return { created, failed, total: tickets.length, results, siteUrl: siteUrl || baseUrl };
}

/**
 * Build Jira auth config from environment variables.
 * @returns {{ authHeader: string, baseUrl: string, siteUrl: string }}
 */
function buildJiraAuthFromEnv() {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraEmail = process.env.JIRA_USER_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    throw new Error('Jira credentials not configured. Set JIRA_BASE_URL, JIRA_USER_EMAIL, and JIRA_API_TOKEN.');
  }

  const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`;
  return { authHeader, baseUrl: jiraBaseUrl, siteUrl: jiraBaseUrl };
}

module.exports = { generateTickets, submitToJira, buildJiraAuthFromEnv };
