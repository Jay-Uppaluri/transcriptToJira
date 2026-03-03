import { getJiraConnection, updateTokens } from './db.js';

const CLIENT_ID = () => process.env.ATLASSIAN_CLIENT_ID;
const CLIENT_SECRET = () => process.env.ATLASSIAN_CLIENT_SECRET;
const CALLBACK_URL = () => process.env.ATLASSIAN_CALLBACK_URL;

const SCOPES = ['read:jira-work', 'write:jira-work', 'read:jira-user', 'offline_access'];

export function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: CLIENT_ID(),
    scope: SCOPES.join(' '),
    redirect_uri: CALLBACK_URL(),
    state,
    response_type: 'code',
    prompt: 'consent',
  });
  return `https://auth.atlassian.com/authorize?${params}`;
}

export async function exchangeCodeForTokens(code) {
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      code,
      redirect_uri: CALLBACK_URL(),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, scope }
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, scope }
}

export async function getAccessibleResources(accessToken) {
  const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch accessible resources');
  return res.json(); // [{ id, url, name, scopes, avatarUrl }]
}

export async function getValidAccessToken(sessionId) {
  const conn = getJiraConnection(sessionId);
  if (!conn) return null;

  const expiresAt = new Date(conn.token_expires_at);
  const buffer = 60 * 1000; // refresh 1 minute before expiry
  if (expiresAt.getTime() - buffer > Date.now()) {
    return { accessToken: conn.accessToken, cloudId: conn.cloud_id, siteUrl: conn.site_url };
  }

  // Token expired or about to expire — refresh
  const tokens = await refreshAccessToken(conn.refreshToken);
  updateTokens(sessionId, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  });
  return { accessToken: tokens.access_token, cloudId: conn.cloud_id, siteUrl: conn.site_url };
}
