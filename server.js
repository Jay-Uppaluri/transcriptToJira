import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import OpenAI from 'openai';
import db, { createSession, getSession, saveJiraConnection, getJiraConnection, deleteJiraConnection } from './server/db.js';
import { getAuthorizationUrl, exchangeCodeForTokens, getAccessibleResources, getValidAccessToken } from './server/jiraAuth.js';
import { authenticateToken, signToken } from './middleware/auth.js';
import { TEST_PRD, getTestTickets } from './server/testData.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

let _openai;
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const COOKIE_NAME = 'session_id';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 };

// --- Session middleware (for Jira OAuth) ---
function ensureSession(req, res, next) {
  let sessionId = req.cookies[COOKIE_NAME];
  if (sessionId && getSession(sessionId)) {
    req.sessionId = sessionId;
  } else {
    sessionId = createSession();
    res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTS);
    req.sessionId = sessionId;
  }
  next();
}

app.use(ensureSession);

// ==================== User Auth Routes (JWT) ====================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, jobTitle } = req.body;
    if (!email || !password || !name || !jobTitle) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name, job_title) VALUES (?, ?, ?, ?)'
    ).run(email, passwordHash, name, jobTitle);

    const token = signToken({ id: result.lastInsertRowid, email, name, jobTitle });
    res.json({ token, user: { id: result.lastInsertRowid, email, name, jobTitle } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name, jobTitle: user.job_title });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, jobTitle: user.job_title } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, name, job_title FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, name: user.name, jobTitle: user.job_title });
});

// ==================== Jira OAuth Routes ====================

app.get('/auth/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
  res.redirect(getAuthorizationUrl(state));
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const savedState = req.cookies.oauth_state;
    res.clearCookie('oauth_state');

    if (!code || !state || state !== savedState) {
      return res.status(400).send('Invalid OAuth callback — state mismatch or missing code.');
    }

    const tokens = await exchangeCodeForTokens(code);
    const { access_token, refresh_token, expires_in } = tokens;

    const resources = await getAccessibleResources(access_token);
    if (!resources.length) {
      return res.status(400).send('No accessible Jira sites found for this account.');
    }
    const site = resources[0];

    let userEmail = '';
    try {
      const meRes = await fetch(`https://api.atlassian.com/ex/jira/${site.id}/rest/api/3/myself`, {
        headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        userEmail = me.emailAddress || '';
      }
    } catch { /* email is optional */ }

    saveJiraConnection(req.sessionId, {
      cloudId: site.id,
      siteName: site.name,
      siteUrl: site.url,
      userEmail,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
    });

    res.redirect('/');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send(`OAuth error: ${err.message}`);
  }
});

app.get('/auth/status', (req, res) => {
  const conn = getJiraConnection(req.sessionId);
  if (!conn) return res.json({ connected: false });
  res.json({
    connected: true,
    siteName: conn.site_name,
    siteUrl: conn.site_url,
    userEmail: conn.user_email,
  });
});

app.post('/auth/disconnect', (req, res) => {
  deleteJiraConnection(req.sessionId);
  res.json({ ok: true });
});

// ==================== Jira Projects Route ====================

app.get('/api/jira/projects', async (req, res) => {
  try {
    const tokenInfo = await getValidAccessToken(req.sessionId);
    if (!tokenInfo) return res.status(401).json({ error: 'Not connected to Jira' });

    const { accessToken, cloudId } = tokenInfo;
    const jiraRes = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=100&orderBy=name`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!jiraRes.ok) {
      const errText = await jiraRes.text();
      return res.status(jiraRes.status).json({ error: `Jira API error: ${errText}` });
    }
    const data = await jiraRes.json();
    const projects = data.values.map(p => ({ key: p.key, name: p.name, id: p.id }));
    res.json({ projects });
  } catch (err) {
    console.error('Projects fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== PRD Routes (auth required) ====================

app.get('/api/prds', authenticateToken, (req, res) => {
  const prds = db.prepare(`
    SELECT prds.id, prds.title, prds.project_key, prds.created_at, prds.updated_at,
           users.name as creator_name, users.job_title as creator_job_title
    FROM prds
    JOIN users ON prds.created_by = users.id
    ORDER BY prds.updated_at DESC
  `).all();
  res.json(prds);
});

app.get('/api/prds/:id', authenticateToken, (req, res) => {
  const prd = db.prepare(`
    SELECT prds.*, users.name as creator_name, users.job_title as creator_job_title
    FROM prds
    JOIN users ON prds.created_by = users.id
    WHERE prds.id = ?
  `).get(req.params.id);

  if (!prd) return res.status(404).json({ error: 'PRD not found' });

  // Fetch all comments (parents + replies)
  const allComments = db.prepare(`
    SELECT comments.*, users.name as user_name, users.job_title as user_job_title
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.prd_id = ?
    ORDER BY comments.created_at ASC
  `).all(req.params.id);

  // Group into threads: parent comments with nested replies
  const parentComments = allComments.filter(c => !c.parent_comment_id);
  const replies = allComments.filter(c => c.parent_comment_id);
  const threaded = parentComments.map(parent => ({
    ...parent,
    replies: replies.filter(r => r.parent_comment_id === parent.id),
  }));

  res.json({ ...prd, comments: threaded });
});

app.post('/api/prds', authenticateToken, (req, res) => {
  const { title, transcript, content, projectKey } = req.body;
  if (!transcript || !content) {
    return res.status(400).json({ error: 'Transcript and content are required' });
  }

  const result = db.prepare(
    'INSERT INTO prds (title, transcript, content, project_key, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(title || 'Untitled PRD', transcript, content, projectKey || 'KAN', req.user.id);

  res.json({ id: result.lastInsertRowid });
});

app.put('/api/prds/:id', authenticateToken, (req, res) => {
  const { title, content } = req.body;
  const prd = db.prepare('SELECT * FROM prds WHERE id = ?').get(req.params.id);
  if (!prd) return res.status(404).json({ error: 'PRD not found' });

  db.prepare(
    'UPDATE prds SET title = COALESCE(?, title), content = COALESCE(?, content), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(title || null, content || null, req.params.id);

  res.json({ success: true });
});

app.delete('/api/prds/:id', authenticateToken, (req, res) => {
  const prd = db.prepare('SELECT * FROM prds WHERE id = ?').get(req.params.id);
  if (!prd) return res.status(404).json({ error: 'PRD not found' });

  const user = db.prepare('SELECT job_title FROM users WHERE id = ?').get(req.user.id);
  if (prd.created_by !== req.user.id && user.job_title !== 'Admin') {
    return res.status(403).json({ error: 'Only the creator or an Admin can delete this PRD' });
  }

  db.prepare('DELETE FROM prds WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== Comment Routes (auth required) ====================

app.get('/api/prds/:id/comments', authenticateToken, (req, res) => {
  const comments = db.prepare(`
    SELECT comments.*, users.name as user_name, users.job_title as user_job_title
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.prd_id = ?
    ORDER BY comments.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

app.post('/api/prds/:id/comments', authenticateToken, (req, res) => {
  const { content, selection_text, selection_prefix, selection_suffix, selection_start, selection_end, comment_type, suggested_text, parent_comment_id } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  const prd = db.prepare('SELECT id FROM prds WHERE id = ?').get(req.params.id);
  if (!prd) return res.status(404).json({ error: 'PRD not found' });

  if (parent_comment_id) {
    const parent = db.prepare('SELECT id FROM comments WHERE id = ? AND prd_id = ?').get(parent_comment_id, req.params.id);
    if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
  }

  const result = db.prepare(`
    INSERT INTO comments (prd_id, user_id, content, selection_text, selection_prefix, selection_suffix, selection_start, selection_end, comment_type, suggested_text, parent_comment_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id, req.user.id, content.trim(),
    selection_text || null, selection_prefix || null, selection_suffix || null,
    selection_start ?? null, selection_end ?? null,
    comment_type || 'general', suggested_text || null,
    parent_comment_id || null
  );

  const comment = db.prepare(`
    SELECT comments.*, users.name as user_name, users.job_title as user_job_title
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.id = ?
  `).get(result.lastInsertRowid);

  res.json(comment);
});

app.delete('/api/comments/:id', authenticateToken, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own comments' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.patch('/api/comments/:id/resolve', authenticateToken, (req, res) => {
  const { action } = req.body; // 'resolve' | 'accept' | 'reject'
  if (!['resolve', 'accept', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be resolve, accept, or reject' });
  }

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const statusMap = { resolve: 'resolved', accept: 'accepted', reject: 'rejected' };
  const newStatus = statusMap[action];

  // If accepting a suggestion, apply the text replacement to the PRD
  if (action === 'accept' && comment.comment_type === 'suggestion' && comment.suggested_text != null) {
    const prd = db.prepare('SELECT content FROM prds WHERE id = ?').get(comment.prd_id);
    if (prd && comment.selection_text) {
      const updatedContent = prd.content.replace(comment.selection_text, comment.suggested_text);
      db.prepare('UPDATE prds SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(updatedContent, comment.prd_id);
    }
  }

  db.prepare(
    'UPDATE comments SET status = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(newStatus, req.user.id, req.params.id);

  const updated = db.prepare(`
    SELECT comments.*, users.name as user_name, users.job_title as user_job_title
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.id = ?
  `).get(req.params.id);

  // If suggestion was accepted, return the updated PRD content too
  if (action === 'accept' && comment.comment_type === 'suggestion') {
    const prd = db.prepare('SELECT content FROM prds WHERE id = ?').get(comment.prd_id);
    return res.json({ comment: updated, updatedPrdContent: prd?.content });
  }

  res.json({ comment: updated });
});

// ==================== Existing Routes (now auth-gated) ====================

// Step 1: Transcript -> PRD
app.post('/api/generate-prd', authenticateToken, async (req, res) => {
  try {
    const { transcript, projectKey, testMode } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    if (testMode) {
      const prdContent = TEST_PRD;
      const title = 'Checkout Flow Redesign';
      const result = db.prepare(
        'INSERT INTO prds (title, transcript, content, project_key, created_by) VALUES (?, ?, ?, ?, ?)'
      ).run(title, transcript, prdContent, projectKey || 'KAN', req.user.id);
      return res.json({ prd: prdContent, prdId: result.lastInsertRowid, title });
    }

    const completion = await getOpenAI().chat.completions.create({
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

    const prdContent = completion.choices[0].message.content;

    // Extract title from PRD (first heading or first line)
    const titleMatch = prdContent.match(/^#\s+(?:\*\*)?(.+?)(?:\*\*)?$/m);
    const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : 'Untitled PRD';

    // Auto-save PRD to database
    const result = db.prepare(
      'INSERT INTO prds (title, transcript, content, project_key, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(title, transcript, prdContent, projectKey || 'KAN', req.user.id);

    res.json({ prd: prdContent, prdId: result.lastInsertRowid, title });
  } catch (err) {
    console.error('PRD generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 2: PRD -> Jira Tickets
app.post('/api/generate-tickets', authenticateToken, async (req, res) => {
  try {
    const { prd, projectKey, testMode } = req.body;
    if (!prd) return res.status(400).json({ error: 'PRD is required' });

    if (testMode) {
      return res.json({ tickets: getTestTickets(projectKey) });
    }

    const completion = await getOpenAI().chat.completions.create({
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
    content = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    const tickets = JSON.parse(content);
    res.json({ tickets });
  } catch (err) {
    console.error('Ticket generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 3: Submit to Jira
app.post('/api/submit-to-jira', authenticateToken, async (req, res) => {
  const { tickets } = req.body;
  if (!tickets || !tickets.length) {
    return res.status(400).json({ error: 'No tickets provided' });
  }

  // Try OAuth first
  let authHeader, baseUrl, siteUrl;
  try {
    const tokenInfo = await getValidAccessToken(req.sessionId);
    if (tokenInfo) {
      authHeader = `Bearer ${tokenInfo.accessToken}`;
      baseUrl = `https://api.atlassian.com/ex/jira/${tokenInfo.cloudId}`;
      siteUrl = tokenInfo.siteUrl;
    }
  } catch (err) {
    console.error('OAuth token error, falling back to env vars:', err.message);
  }

  // Fall back to legacy env-var auth
  if (!authHeader) {
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraEmail = process.env.JIRA_USER_EMAIL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;

    if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
      return res.status(401).json({ error: 'Not connected to Jira. Please connect your account first.' });
    }

    authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`;
    baseUrl = jiraBaseUrl;
    siteUrl = jiraBaseUrl;
  }

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
      results.push({ success: response.ok, status: response.status, data });
    } catch (err) {
      results.push({ success: false, error: err.message });
    }
  }

  const created = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  res.json({ created, failed, total: tickets.length, results, siteUrl });
});

// ==================== VTT Upload & Action Item Extraction ====================

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function parseVTT(vttText) {
  const lines = vttText.split('\n');
  const entries = [];
  let i = 0;
  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes('-->')) i++;
  while (i < lines.length) {
    if (lines[i].includes('-->')) {
      i++;
      let text = '';
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
        text += lines[i].trim() + ' ';
        i++;
      }
      // Extract speaker from <v Name>text</v> format
      const speakerMatch = text.match(/<v\s+([^>]+)>(.*?)<\/v>/);
      if (speakerMatch) {
        entries.push({ speaker: speakerMatch[1].trim(), text: speakerMatch[2].trim() });
      } else {
        entries.push({ speaker: 'Unknown', text: text.trim() });
      }
    } else {
      i++;
    }
  }
  return entries.map(e => `${e.speaker}: ${e.text}`).join('\n');
}

app.post('/api/vtt/upload', authenticateToken, upload.single('vttFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const vttText = req.file.buffer.toString('utf-8');
    const transcript = parseVTT(vttText);
    if (!transcript.trim()) return res.status(400).json({ error: 'Could not parse any content from VTT file' });

    const projectKey = req.body.projectKey || process.env.JIRA_PROJECT_KEY || 'KAN';

    // Step 1: Generate PRD from transcript
    const prdCompletion = await getOpenAI().chat.completions.create({
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

    const prdContent = prdCompletion.choices[0].message.content;
    const titleMatch = prdContent.match(/^#\s+(?:\*\*)?(.+?)(?:\*\*)?$/m);
    const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : 'Untitled PRD';

    // Save PRD to database
    const prdResult = db.prepare(
      'INSERT INTO prds (title, transcript, content, project_key, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(title, transcript, prdContent, projectKey, req.user.id);

    // Step 2: Generate Jira tickets from PRD
    const ticketCompletion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You are a senior engineering lead. Given a PRD, break it down into Jira tickets.

Return a JSON array of tickets. Each ticket MUST follow the exact Jira REST API format for POST /rest/api/3/issue:

{
  "fields": {
    "project": { "key": "${projectKey}" },
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
        { role: 'user', content: `Here is the PRD:\n\n${prdContent}` }
      ]
    });

    let ticketContent = ticketCompletion.choices[0].message.content;
    ticketContent = ticketContent.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    const tickets = JSON.parse(ticketContent);

    res.json({
      transcript,
      prd: prdContent,
      prdId: prdResult.lastInsertRowid,
      prdTitle: title,
      tickets,
      submitted: false,
    });
  } catch (err) {
    console.error('VTT upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit previously extracted VTT tickets to Jira
app.post('/api/vtt/submit-tickets', authenticateToken, async (req, res) => {
  const { tickets } = req.body;
  if (!tickets || !tickets.length) return res.status(400).json({ error: 'No tickets provided' });

  let authHeader, baseUrl, siteUrl;
  try {
    const tokenInfo = await getValidAccessToken(req.sessionId);
    if (tokenInfo) {
      authHeader = `Bearer ${tokenInfo.accessToken}`;
      baseUrl = `https://api.atlassian.com/ex/jira/${tokenInfo.cloudId}`;
      siteUrl = tokenInfo.siteUrl;
    }
  } catch (err) { /* fall through */ }

  if (!authHeader) {
    const jiraBaseUrl = process.env.JIRA_BASE_URL;
    const jiraEmail = process.env.JIRA_USER_EMAIL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;
    if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
      return res.status(401).json({ error: 'Not connected to Jira' });
    }
    authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`;
    baseUrl = jiraBaseUrl;
    siteUrl = jiraBaseUrl;
  }

  const results = [];
  for (const ticket of tickets) {
    try {
      const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(ticket),
      });
      const data = await response.json();
      results.push({ success: response.ok, status: response.status, data, summary: ticket.fields?.summary });
    } catch (err) {
      results.push({ success: false, error: err.message, summary: ticket.fields?.summary });
    }
  }

  res.json({ created: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, total: tickets.length, results, siteUrl });
});

// Serve static frontend in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'dist')));
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
