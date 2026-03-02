import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Step 1: Transcript → PRD
app.post('/api/generate-prd', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `You are a senior product manager. Given a Microsoft Teams meeting transcript, extract and produce a detailed Product Requirements Document (PRD).

Structure the PRD with these sections:
1. **Title** — A concise product/feature name
2. **Overview** — What is being built and why (2-3 paragraphs)
3. **Problem Statement** — The pain points discussed
4. **Goals & Success Metrics** — Measurable outcomes
5. **User Stories** — In "As a [user], I want [action] so that [benefit]" format
6. **Functional Requirements** — Detailed, numbered list
7. **Non-Functional Requirements** — Performance, security, scalability, etc.
8. **Acceptance Criteria** — Testable conditions for each major feature
9. **Out of Scope** — What was explicitly excluded
10. **Open Questions** — Unresolved items from the discussion
11. **Dependencies** — External teams, systems, or blockers
12. **Timeline & Milestones** — If discussed

Be thorough. Extract every detail from the transcript. If something is ambiguous, note it in Open Questions.`
        },
        { role: 'user', content: `Here is the Teams meeting transcript:\n\n${transcript}` }
      ]
    });

    res.json({ prd: completion.choices[0].message.content });
  } catch (err) {
    console.error('PRD generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 2: PRD → Jira Tickets
app.post('/api/generate-tickets', async (req, res) => {
  try {
    const { prd, projectKey } = req.body;
    if (!prd) return res.status(400).json({ error: 'PRD is required' });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You are a senior engineering lead. Given a PRD, break it down into Jira tickets.

Return a JSON array of tickets. Each ticket MUST follow the exact Jira REST API format for POST /rest/api/3/issue:

{
  "fields": {
    "project": { "key": "${projectKey || 'PROJ'}" },
    "summary": "Ticket title",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Description text here" }]
        }
      ]
    },
    "issuetype": { "name": "Story" | "Task" | "Bug" | "Epic" },
    "priority": { "name": "Highest" | "High" | "Medium" | "Low" | "Lowest" },
    "labels": ["label1", "label2"],
    "components": [{ "name": "component-name" }]
  }
}

Guidelines:
- Create an Epic for the overall feature
- Break into Stories for user-facing functionality
- Create Tasks for technical/infrastructure work
- Include acceptance criteria in each ticket description using Jira ADF (Atlassian Document Format)
- Use bullet lists in ADF format for acceptance criteria
- Set appropriate priority levels
- Add relevant labels
- Reference the Epic in story descriptions

Return ONLY valid JSON — an array of ticket objects. No markdown, no explanation.`
        },
        { role: 'user', content: `Here is the PRD:\n\n${prd}` }
      ]
    });

    let content = completion.choices[0].message.content;
    // Strip markdown code fences if present
    content = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    const tickets = JSON.parse(content);
    res.json({ tickets });
  } catch (err) {
    console.error('Ticket generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 3: Submit to Jira
app.post('/api/submit-to-jira', async (req, res) => {
  const { tickets } = req.body;
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraEmail = process.env.JIRA_USER_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    return res.status(500).json({ error: 'Jira credentials not configured in .env' });
  }
  if (!tickets || !tickets.length) {
    return res.status(400).json({ error: 'No tickets provided' });
  }

  const projectKey = process.env.JIRA_PROJECT_KEY || 'KAN';
  const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`;
  const results = [];

  for (const ticket of tickets) {
    // Ensure project key is set correctly
    if (ticket.fields) {
      ticket.fields.project = { key: projectKey };
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
      results.push({ success: response.ok, status: response.status, data });
    } catch (err) {
      results.push({ success: false, error: err.message });
    }
  }

  const created = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  res.json({ created, failed, total: tickets.length, results });
});

const PORT = 3010;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
