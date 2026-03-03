import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { encrypt, decrypt } from './crypto.js';

const DATA_DIR = path.resolve('data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jira_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    cloud_id TEXT NOT NULL,
    site_name TEXT,
    site_url TEXT,
    user_email TEXT,
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT NOT NULL,
    token_expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    transcript TEXT NOT NULL,
    content TEXT NOT NULL,
    project_key TEXT DEFAULT 'KAN',
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prd_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Idempotent migrations for inline comments
const migrations = [
  'ALTER TABLE comments ADD COLUMN selection_text TEXT',
  'ALTER TABLE comments ADD COLUMN selection_prefix TEXT',
  'ALTER TABLE comments ADD COLUMN selection_suffix TEXT',
  'ALTER TABLE comments ADD COLUMN selection_start INTEGER',
  'ALTER TABLE comments ADD COLUMN selection_end INTEGER',
  "ALTER TABLE comments ADD COLUMN comment_type TEXT DEFAULT 'general'",
  'ALTER TABLE comments ADD COLUMN suggested_text TEXT',
  "ALTER TABLE comments ADD COLUMN status TEXT DEFAULT 'open'",
  'ALTER TABLE comments ADD COLUMN parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE',
  'ALTER TABLE comments ADD COLUMN resolved_by INTEGER REFERENCES users(id)',
  'ALTER TABLE comments ADD COLUMN resolved_at DATETIME',
];

for (const sql of migrations) {
  try { db.exec(sql); } catch { /* column already exists */ }
}

// --- Sessions ---

export function createSession() {
  const id = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  db.prepare('INSERT INTO sessions (id, expires_at) VALUES (?, ?)').run(id, expires.toISOString());
  return id;
}

export function getSession(id) {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return null;
  }
  return row;
}

// --- Jira Connections ---

export function saveJiraConnection(sessionId, { cloudId, siteName, siteUrl, userEmail, accessToken, refreshToken, expiresIn }) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const stmt = db.prepare(`
    INSERT INTO jira_connections (session_id, cloud_id, site_name, site_url, user_email, access_token_enc, refresh_token_enc, token_expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      cloud_id = excluded.cloud_id,
      site_name = excluded.site_name,
      site_url = excluded.site_url,
      user_email = excluded.user_email,
      access_token_enc = excluded.access_token_enc,
      refresh_token_enc = excluded.refresh_token_enc,
      token_expires_at = excluded.token_expires_at,
      updated_at = datetime('now')
  `);
  stmt.run(sessionId, cloudId, siteName, siteUrl, userEmail, encrypt(accessToken), encrypt(refreshToken), expiresAt);
}

export function getJiraConnection(sessionId) {
  const row = db.prepare('SELECT * FROM jira_connections WHERE session_id = ?').get(sessionId);
  if (!row) return null;
  return {
    ...row,
    accessToken: decrypt(row.access_token_enc),
    refreshToken: decrypt(row.refresh_token_enc),
  };
}

export function updateTokens(sessionId, { accessToken, refreshToken, expiresIn }) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  db.prepare(`
    UPDATE jira_connections
    SET access_token_enc = ?, refresh_token_enc = ?, token_expires_at = ?, updated_at = datetime('now')
    WHERE session_id = ?
  `).run(encrypt(accessToken), encrypt(refreshToken), expiresAt, sessionId);
}

export function deleteJiraConnection(sessionId) {
  db.prepare('DELETE FROM jira_connections WHERE session_id = ?').run(sessionId);
}

export default db;
