import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';
import db, { createSession, getSession, saveJiraConnection, getJiraConnection, deleteJiraConnection } from './server/db.js';
import { getAuthorizationUrl, exchangeCodeForTokens, getAccessibleResources, getValidAccessToken } from './server/jiraAuth.js';
import { authenticateToken, signToken } from './middleware/auth.js';
import { TEST_PRD, getTestTickets } from './server/testData.js';

// Shared services (CJS — used by both web app and Teams bot)
const require = createRequire(import.meta.url);
const { generatePRD: sharedGeneratePRD, countWords, LONG_TRANSCRIPT_THRESHOLD } = require('./shared/prdService.cjs');
const { generateTickets: sharedGenerateTickets, submitTickets: sharedSubmitTickets, buildAuthFromEnv, getProviderInfo, PROVIDER } = require('./shared/ticketProvider.cjs');

// Max transcript length (words). Default: 60,000 (~1 hour meeting)
const MAX_TRANSCRIPT_WORDS = parseInt(process.env.MAX_TRANSCRIPT_WORDS || '60000', 10);
// Keep direct Jira imports for OAuth-specific routes
const { buildJiraAuthFromEnv } = require('./shared/ticketService.cjs');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

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

// ==================== Provider Info Route ====================

app.get('/api/provider', (req, res) => {
  res.json(getProviderInfo());
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

// Step 1: Transcript -> PRD (supports SSE for long transcripts)
app.post('/api/generate-prd', authenticateToken, async (req, res) => {
  try {
    const { transcript, projectKey, testMode, stream: useSSE } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript is required' });

    // Word limit check
    const wordCount = countWords(transcript);
    if (wordCount > MAX_TRANSCRIPT_WORDS) {
      return res.status(413).json({
        error: `Transcript too long: ${wordCount.toLocaleString()} words (limit: ${MAX_TRANSCRIPT_WORDS.toLocaleString()}). Please trim the transcript or split into separate meetings.`,
      });
    }

    if (testMode) {
      const prdContent = TEST_PRD;
      const title = 'Checkout Flow Redesign';
      const result = db.prepare(
        'INSERT INTO prds (title, transcript, content, project_key, created_by) VALUES (?, ?, ?, ?, ?)'
      ).run(title, transcript, prdContent, projectKey || 'KAN', req.user.id);
      return res.json({ prd: prdContent, prdId: result.lastInsertRowid, title });
    }

    // SSE mode for long transcripts: stream progress events
    if (useSSE && wordCount > LONG_TRANSCRIPT_THRESHOLD) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const onProgress = (progress) => {
        sendEvent({ type: 'progress', ...progress });
      };

      sendEvent({ type: 'progress', phase: 'start', message: `Processing ${wordCount.toLocaleString()} word transcript...`, totalWords: wordCount });

      const { prd: prdContent, title, usage, warnings } = await sharedGeneratePRD(transcript, process.env.OPENAI_API_KEY, { onProgress });

      const result = db.prepare(
        'INSERT INTO prds (title, transcript, content, project_key, created_by) VALUES (?, ?, ?, ?, ?)'
      ).run(title, transcript, prdContent, projectKey || 'KAN', req.user.id);

      sendEvent({ type: 'complete', prd: prdContent, prdId: result.lastInsertRowid, title, usage, warnings });
      res.end();
      return;
    }

    // Standard JSON response for short transcripts
    const { prd: prdContent, title, usage, warnings } = await sharedGeneratePRD(transcript, process.env.OPENAI_API_KEY);

    const result = db.prepare(
      'INSERT INTO prds (title, transcript, content, project_key, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(title, transcript, prdContent, projectKey || 'KAN', req.user.id);

    res.json({ prd: prdContent, prdId: result.lastInsertRowid, title, usage, warnings });
  } catch (err) {
    console.error('PRD generation error:', err);
    // If we're in SSE mode and headers already sent, send error as event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.message });
    }
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

    const { tickets } = await sharedGenerateTickets(prd, projectKey || 'KAN', process.env.OPENAI_API_KEY);
    res.json({ tickets });
  } catch (err) {
    console.error('Ticket generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 3: Submit tickets/work items to the configured provider
async function handleSubmitTickets(req, res) {
  const { tickets } = req.body;
  if (!tickets || !tickets.length) {
    return res.status(400).json({ error: 'No tickets provided' });
  }

  const info = getProviderInfo();

  // Build auth config — for Jira, try OAuth first then env vars; for ADO, use env vars
  let auth;
  if (PROVIDER === 'jira') {
    try {
      const tokenInfo = await getValidAccessToken(req.sessionId);
      if (tokenInfo) {
        auth = {
          authHeader: `Bearer ${tokenInfo.accessToken}`,
          baseUrl: `https://api.atlassian.com/ex/jira/${tokenInfo.cloudId}`,
          siteUrl: tokenInfo.siteUrl,
        };
      }
    } catch (err) {
      console.error('OAuth token error, falling back to env vars:', err.message);
    }
  }

  if (!auth) {
    try {
      auth = buildAuthFromEnv();
    } catch (err) {
      return res.status(401).json({ error: `Not connected to ${info.displayName}. Please check configuration.` });
    }
  }

  const result = await sharedSubmitTickets(tickets, auth);
  res.json(result);
}

app.post('/api/submit-tickets', authenticateToken, handleSubmitTickets);
// Backwards compatibility alias
app.post('/api/submit-to-jira', authenticateToken, handleSubmitTickets);

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

    // Word limit check
    const wordCount = countWords(transcript);
    if (wordCount > MAX_TRANSCRIPT_WORDS) {
      return res.status(413).json({
        error: `Transcript too long: ${wordCount.toLocaleString()} words (limit: ${MAX_TRANSCRIPT_WORDS.toLocaleString()}). Please trim the transcript or split into separate meetings.`,
      });
    }

    const projectKey = req.body.projectKey || process.env.JIRA_PROJECT_KEY || 'KAN';
    const apiKey = process.env.OPENAI_API_KEY;

    // Step 1: Generate PRD from transcript (shared service)
    const { prd: prdContent, title, usage, warnings } = await sharedGeneratePRD(transcript, apiKey);

    // Save PRD to database
    const prdResult = db.prepare(
      'INSERT INTO prds (title, transcript, content, project_key, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(title, transcript, prdContent, projectKey, req.user.id);

    // Step 2: Generate Jira tickets from PRD (shared service)
    const { tickets } = await sharedGenerateTickets(prdContent, projectKey, apiKey);

    res.json({
      transcript,
      prd: prdContent,
      prdId: prdResult.lastInsertRowid,
      prdTitle: title,
      tickets,
      submitted: false,
      wordCount,
      usage,
      warnings,
    });
  } catch (err) {
    console.error('VTT upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// SSE endpoint for VTT upload with progress streaming (long transcripts)
app.post('/api/vtt/upload-stream', authenticateToken, upload.single('vttFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const vttText = req.file.buffer.toString('utf-8');
    const transcript = parseVTT(vttText);
    if (!transcript.trim()) return res.status(400).json({ error: 'Could not parse any content from VTT file' });

    const wordCount = countWords(transcript);
    if (wordCount > MAX_TRANSCRIPT_WORDS) {
      return res.status(413).json({
        error: `Transcript too long: ${wordCount.toLocaleString()} words (limit: ${MAX_TRANSCRIPT_WORDS.toLocaleString()}).`,
      });
    }

    const projectKey = req.body.projectKey || process.env.JIRA_PROJECT_KEY || 'KAN';
    const apiKey = process.env.OPENAI_API_KEY;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (data) => { res.write(`data: ${JSON.stringify(data)}\n\n`); };
    const onProgress = (progress) => { sendEvent({ type: 'progress', ...progress }); };

    sendEvent({ type: 'progress', phase: 'start', message: `Processing ${wordCount.toLocaleString()} word transcript...`, totalWords: wordCount });

    const { prd: prdContent, title, usage, warnings } = await sharedGeneratePRD(transcript, apiKey, { onProgress });

    const prdResult = db.prepare(
      'INSERT INTO prds (title, transcript, content, project_key, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(title, transcript, prdContent, projectKey, req.user.id);

    sendEvent({ type: 'progress', phase: 'tickets', message: 'Generating tickets...' });
    const { tickets } = await sharedGenerateTickets(prdContent, projectKey, apiKey);

    sendEvent({
      type: 'complete',
      transcript, prd: prdContent, prdId: prdResult.lastInsertRowid,
      prdTitle: title, tickets, submitted: false, wordCount, usage, warnings,
    });
    res.end();
  } catch (err) {
    console.error('VTT upload stream error:', err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Submit previously extracted VTT tickets to the configured provider
app.post('/api/vtt/submit-tickets', authenticateToken, handleSubmitTickets);

// ==================== Teams Bot Integration ====================
// Mount the Teams bot on this same Express server so Azure App Service
// can serve both the web UI and the bot on a single port.

let teamsBot = null;
try {
  teamsBot = require('./bot/src/app/app.js');
  console.log('Teams bot module loaded');
} catch (err) {
  console.warn('Teams bot module not loaded (non-fatal):', err.message);
}

if (teamsBot && teamsBot.adapter) {
  // If the bot exposes an adapter, mount it directly
  app.post('/api/messages', (req, res) => {
    teamsBot.adapter.process(req, res, teamsBot);
  });
  console.log('Teams bot mounted at /api/messages (adapter mode)');
} else if (teamsBot) {
  // The @microsoft/teams.apps App creates its own HTTP server.
  // We run it on an internal port and proxy /api/messages to it.
  const BOT_INTERNAL_PORT = 3978;

  // Proxy /api/messages to the internal bot server
  app.post('/api/messages', async (req, res) => {
    try {
      const proxyRes = await fetch(`http://127.0.0.1:${BOT_INTERNAL_PORT}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(
            Object.entries(req.headers).filter(([k]) =>
              k.startsWith('authorization') || k === 'ms-cv' || k.startsWith('x-')
            )
          ),
        },
        body: JSON.stringify(req.body),
      });
      const data = await proxyRes.text();
      res.status(proxyRes.status);
      for (const [key, value] of proxyRes.headers.entries()) {
        res.setHeader(key, value);
      }
      res.send(data);
    } catch (err) {
      console.error('Bot proxy error:', err.message);
      res.status(502).json({ error: 'Bot unavailable' });
    }
  });

  // Start the bot on the internal port
  teamsBot.start(BOT_INTERNAL_PORT).then(() => {
    console.log(`Teams bot running on internal port ${BOT_INTERNAL_PORT}, proxied at /api/messages`);
  }).catch(err => {
    console.error('Failed to start Teams bot:', err);
  });
}

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
