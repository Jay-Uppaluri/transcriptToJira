import { getFigmaConnection, updateFigmaTokens } from './db.js';

const CLIENT_ID = () => process.env.FIGMA_CLIENT_ID;
const CLIENT_SECRET = () => process.env.FIGMA_CLIENT_SECRET;
const CALLBACK_URL = () => process.env.FIGMA_CALLBACK_URL || 'http://localhost:5173/auth/figma/callback';

const SCOPES = 'current_user:read,file_content:read,file_metadata:read,file_comments:read,file_comments:write,projects:read';

export function getFigmaAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    redirect_uri: CALLBACK_URL(),
    scope: SCOPES,
    state,
    response_type: 'code',
  });
  return `https://www.figma.com/oauth?${params}`;
}

export async function exchangeFigmaCodeForTokens(code) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    client_secret: CLIENT_SECRET(),
    redirect_uri: CALLBACK_URL(),
    code,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://api.figma.com/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Figma token exchange failed: ${err}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, user_id }
}

export async function refreshFigmaAccessToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    client_secret: CLIENT_SECRET(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://api.figma.com/v1/oauth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Figma token refresh failed: ${err}`);
  }
  return res.json(); // { access_token, expires_in }
}

export async function getFigmaUserInfo(accessToken) {
  const res = await fetch('https://api.figma.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Figma user info');
  return res.json(); // { id, email, handle, img_url }
}

export async function getValidFigmaAccessToken(sessionId) {
  const conn = getFigmaConnection(sessionId);
  if (!conn) return null;

  const expiresAt = new Date(conn.token_expires_at);
  const buffer = 60 * 1000;
  if (expiresAt.getTime() - buffer > Date.now()) {
    return { accessToken: conn.accessToken, userId: conn.figma_user_id, handle: conn.handle };
  }

  // Token expired — refresh
  const tokens = await refreshFigmaAccessToken(conn.refreshToken);
  updateFigmaTokens(sessionId, {
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
  });
  return { accessToken: tokens.access_token, userId: conn.figma_user_id, handle: conn.handle };
}
