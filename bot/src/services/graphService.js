const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const config = require('../config');

require('isomorphic-fetch');

let graphClient = null;

function getGraphClient() {
  if (graphClient) return graphClient;

  if (!config.MicrosoftAppTenantId || !config.MicrosoftAppId || !config.graphClientSecret) {
    throw new Error(
      'Microsoft Graph credentials are not configured. ' +
      'Please ensure TENANT_ID, CLIENT_ID, and CLIENT_SECRET (or GRAPH_CLIENT_SECRET) are set in the app settings.'
    );
  }

  const credential = new ClientSecretCredential(
    config.MicrosoftAppTenantId,
    config.MicrosoftAppId,
    config.graphClientSecret
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  graphClient = Client.initWithMiddleware({ authProvider });
  return graphClient;
}

/**
 * Parse VTT transcript content to plain text with speaker names.
 */
function parseVTT(vttContent) {
  const lines = vttContent.split('\n');
  const result = [];
  let currentSpeaker = '';

  for (const line of lines) {
    // Skip WEBVTT header, blank lines, and timestamp lines
    if (line.startsWith('WEBVTT') || line.trim() === '' || /^\d{2}:\d{2}/.test(line.trim())) {
      continue;
    }

    // Extract speaker from <v SpeakerName> tags
    const speakerMatch = line.match(/<v\s+([^>]+)>(.*)/);
    if (speakerMatch) {
      const speaker = speakerMatch[1].trim();
      const text = speakerMatch[2].replace(/<\/v>/g, '').trim();
      if (speaker !== currentSpeaker) {
        currentSpeaker = speaker;
        result.push(`\n${speaker}: ${text}`);
      } else {
        result.push(text);
      }
    } else if (line.trim()) {
      result.push(line.trim());
    }
  }

  return result.join(' ').trim();
}

/**
 * Try to extract the organizer alias from a Teams /meet/ URL.
 * e.g. https://teams.microsoft.com/meet/jay@jayuppalurigmail... → jay@jayuppalurigmail...
 */
function extractOrganizerFromUrl(joinUrl) {
  // /meet/<alias-or-id> pattern
  const meetMatch = joinUrl.match(/teams\.microsoft\.com\/meet\/([^?&#/]+)/i);
  if (meetMatch) return decodeURIComponent(meetMatch[1]);
  return null;
}

/**
 * Look up a user by UPN prefix, alias, or full UPN.
 * Returns the user ID or null.
 */
async function resolveUserId(client, hint) {
  if (!hint) return null;

  try {
    // If it looks like a full UPN or email, try direct lookup
    if (hint.includes('@')) {
      const user = await client.api(`/users/${encodeURIComponent(hint)}`).select('id').get();
      return user?.id || null;
    }

    // Otherwise search by displayName or UPN starting with the alias
    const result = await client
      .api('/users')
      .filter(`startsWith(userPrincipalName, '${hint}')`)
      .select('id,userPrincipalName')
      .top(1)
      .get();

    if (result.value && result.value.length > 0) {
      return result.value[0].id;
    }
  } catch (err) {
    console.log(`[graphService] Could not resolve user hint "${hint}": ${err.message}`);
  }

  return null;
}

/**
 * Hardcoded tenant user IDs as fallback when /users listing fails
 * (e.g., when User.Read.All permission isn't granted yet).
 */
const FALLBACK_USERS = [
  { id: '794e2967-7daf-49f1-aafa-df689648804e', upn: 'jay@jayuppalurigmail.onmicrosoft.com' },
  { id: 'c2e80e42-2dca-40dc-80d5-ff3ce58b39a1', upn: 'sri@jayuppalurigmail.onmicrosoft.com' },
  { id: '15ceafe1-b371-4ec2-b043-01d4c182e479', upn: 'cam@jayuppalurigmail.onmicrosoft.com' },
];

/**
 * Get all tenant users (for small tenants) to try finding the meeting organizer.
 * Falls back to hardcoded list if /users API isn't accessible.
 */
async function getTenantUserIds(client) {
  try {
    const result = await client
      .api('/users')
      .select('id,userPrincipalName')
      .top(50)
      .get();
    const users = (result.value || []).map(u => ({ id: u.id, upn: u.userPrincipalName }));
    if (users.length > 0) return users;
  } catch (err) {
    console.error('[graphService] Failed to list tenant users:', err.message);
  }
  console.log('[graphService] Using fallback user list');
  return FALLBACK_USERS;
}

/**
 * Fetch the meeting transcript given a Teams meeting join URL.
 * Returns { transcript: string, meetingSubject: string }
 *
 * Strategy: The Graph API requires /users/{userId}/onlineMeetings?$filter=JoinWebUrl
 * for app permissions. We try to figure out the organizer from:
 *   1. The URL itself (for /meet/ URLs, the alias is in the path)
 *   2. If that fails, try all known users in the tenant
 */
async function getMeetingTranscript(joinUrl) {
  const client = getGraphClient();

  // Normalize the URL — strip trailing slashes and whitespace
  const normalizedUrl = joinUrl.trim().replace(/\/+$/, '');

  // --- Step 1: Find the meeting by join URL ---
  // With app permissions, we must use /users/{userId}/onlineMeetings?$filter=JoinWebUrl
  // First, try to identify the organizer from the URL
  let meeting = null;
  let organizerId = null;

  // Attempt 1: Extract organizer from URL
  const urlHint = extractOrganizerFromUrl(normalizedUrl);
  if (urlHint) {
    const hintUserId = await resolveUserId(client, urlHint);
    if (hintUserId) {
      meeting = await tryFindMeeting(client, hintUserId, normalizedUrl);
      if (meeting) organizerId = hintUserId;
    }
  }

  // Attempt 2: Try all tenant users
  let accessPolicyDenied = false;
  if (!meeting) {
    const users = await getTenantUserIds(client);
    console.log(`[graphService] Trying ${users.length} tenant users...`);
    for (const user of users) {
      // Skip the hint user we already tried
      if (organizerId && user.id === organizerId) continue;
      try {
        meeting = await tryFindMeeting(client, user.id, normalizedUrl);
        if (meeting) {
          organizerId = user.id;
          break;
        }
      } catch (err) {
        if (err.isAccessPolicy) {
          accessPolicyDenied = true;
          console.log(`[graphService] Access policy denied for user ${user.upn} (${user.id})`);
        } else {
          console.log(`[graphService] Skipping user ${user.upn}: ${err.message}`);
        }
      }
    }
  }

  if (!meeting) {
    if (accessPolicyDenied) {
      throw new Error(
        'The app was denied access to meeting data (403 Forbidden). ' +
        'The Application Access Policy may still be propagating — this can take up to 30 minutes after setup.\n\n' +
        'Please wait a few minutes and try again. If it keeps failing, contact your Teams admin.'
      );
    }
    throw new Error(
      'Could not find this meeting. This can happen if:\n' +
      '• The meeting URL is incorrect or has expired\n' +
      '• The meeting hasn\'t ended yet\n' +
      '• The meeting organizer is outside your organization\n\n' +
      'Please double-check the URL and try again. If you just ended the meeting, wait a minute for it to process.'
    );
  }

  const meetingId = meeting.id;
  const meetingSubject = meeting.subject || 'Untitled Meeting';

  // Use the organizer from the meeting if available, otherwise use the one we found
  const meetingOrganizerId = meeting.participants?.organizer?.identity?.user?.id || organizerId;

  if (!meetingOrganizerId) {
    throw new Error(
      'Found the meeting but could not determine the organizer. ' +
      'Please ensure the meeting was created by a licensed user in your organization.'
    );
  }

  // --- Step 2: Fetch transcripts ---
  let transcriptsResponse;
  try {
    transcriptsResponse = await client
      .api(`/users/${meetingOrganizerId}/onlineMeetings/${meetingId}/transcripts`)
      .get();
  } catch (err) {
    const msg = err.message || String(err);
    const code = err.statusCode || err.code;

    if (code === 403 || msg.includes('Forbidden') || msg.includes('access policy')) {
      throw new Error(
        'Access denied when fetching transcripts. Your Teams admin needs to create an ' +
        'Application Access Policy to allow this app to read meeting transcripts.\n\n' +
        'See: https://learn.microsoft.com/en-us/graph/cloud-communication-online-meeting-application-access-policy'
      );
    }
    if (code === 404 || msg.includes('not found') || msg.includes('Not Found')) {
      throw new Error(
        'The meeting was found but no transcript data is available. ' +
        'Make sure transcription was turned on during the meeting.'
      );
    }
    throw new Error(`Failed to fetch transcripts: ${msg}`);
  }

  if (!transcriptsResponse.value || transcriptsResponse.value.length === 0) {
    throw new Error(
      'No transcripts found for this meeting. Please make sure:\n' +
      '• Transcription was enabled during the meeting\n' +
      '• The meeting has ended and the transcript has finished processing\n' +
      '• You waited at least a minute after the meeting ended'
    );
  }

  // Get the most recent transcript
  const transcript = transcriptsResponse.value[transcriptsResponse.value.length - 1];
  const transcriptId = transcript.id;

  // --- Step 3: Fetch transcript content ---
  let content;
  try {
    content = await client
      .api(`/users/${meetingOrganizerId}/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content`)
      .query({ '$format': 'text/vtt' })
      .get();
  } catch (err) {
    const msg = err.message || String(err);
    if (err.statusCode === 403 || msg.includes('Forbidden')) {
      throw new Error(
        'Access denied when downloading the transcript content. ' +
        'The app may not have the OnlineMeetingTranscript.Read.All permission, ' +
        'or the Application Access Policy needs to be updated.'
      );
    }
    throw new Error(`Failed to download transcript content: ${msg}`);
  }

  // The Graph API returns content as a ReadableStream, Buffer, or string depending on the SDK version
  let vttString;
  if (typeof content === 'string') {
    vttString = content;
  } else if (Buffer.isBuffer(content)) {
    vttString = content.toString('utf-8');
  } else if (content && typeof content.getReader === 'function') {
    // ReadableStream — consume it
    const reader = content.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    vttString = Buffer.concat(chunks).toString('utf-8');
  } else if (content instanceof ArrayBuffer) {
    vttString = Buffer.from(content).toString('utf-8');
  } else {
    vttString = String(content);
  }

  console.log(`[graphService] Transcript content type: ${typeof content}, length: ${vttString.length}`);

  const parsedTranscript = parseVTT(vttString);

  if (!parsedTranscript || parsedTranscript.length < 10) {
    throw new Error(
      'The transcript was found but appears to be empty or too short. ' +
      'The transcript may still be processing — try again in a minute.'
    );
  }

  return {
    transcript: parsedTranscript,
    meetingSubject,
  };
}

/**
 * Extract meeting code from a /meet/ URL.
 * e.g. https://teams.microsoft.com/meet/24719624149788?p=xxx → "24719624149788"
 */
function extractMeetingCode(joinUrl) {
  const match = joinUrl.match(/teams\.microsoft\.com\/meet\/(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Try to find a meeting for a specific user by join URL.
 * Returns the meeting object or null if not found.
 *
 * Strategy:
 * 1. Try OData filter by JoinWebUrl (works for both /meet/ and /meetup-join/ URLs)
 * 2. If /meet/ URL and filter returns 0, fall back to listing recent meetings
 *    and matching by meetingCode
 */
async function tryFindMeeting(client, userId, joinUrl) {
  try {
    console.log(`[graphService] Trying to find meeting for user ${userId} with URL: ${joinUrl.substring(0, 80)}...`);

    // Escape single quotes in the URL for OData filter
    const escapedUrl = joinUrl.replace(/'/g, "''");

    const response = await client
      .api(`/users/${userId}/onlineMeetings`)
      .filter(`JoinWebUrl eq '${escapedUrl}'`)
      .get();

    console.log(`[graphService] User ${userId}: found ${response.value?.length || 0} meetings via JoinWebUrl filter`);
    if (response.value && response.value.length > 0) {
      return response.value[0];
    }

    // Fallback: if this is a /meet/ short URL, the JoinWebUrl filter might not match
    // because Graph stores the full /meetup-join/ URL. Try matching by meetingCode.
    const meetingCode = extractMeetingCode(joinUrl);
    if (meetingCode) {
      console.log(`[graphService] JoinWebUrl filter returned 0 for /meet/ URL. Trying meetingCode fallback: ${meetingCode}`);
      try {
        // List recent meetings and find by meetingCode
        const listResponse = await client
          .api(`/users/${userId}/onlineMeetings`)
          .select('id,meetingCode,subject,joinWebUrl,startDateTime,participants')
          .top(100)
          .orderby('startDateTime desc')
          .get();

        if (listResponse.value) {
          const match = listResponse.value.find(m => m.meetingCode === meetingCode);
          if (match) {
            console.log(`[graphService] Found meeting via meetingCode fallback: "${match.subject}"`);
            return match;
          }
          console.log(`[graphService] meetingCode ${meetingCode} not found among ${listResponse.value.length} listed meetings`);
        }
      } catch (listErr) {
        console.log(`[graphService] meetingCode fallback listing failed: ${listErr.message}`);
      }
    }
  } catch (err) {
    const msg = err.message || String(err);
    const code = err.statusCode || err.code;
    const body = err.body ? JSON.stringify(err.body).substring(0, 300) : 'no body';
    console.error(`[graphService] Error for user ${userId}: code=${code}, msg=${msg}, body=${body}`);

    // Any 403 = likely application access policy issue
    if (code === 403 || msg.includes('403') || msg.includes('Forbidden')) {
      // Track this as an access policy issue so the caller can give a better error
      const policyErr = new Error(`ACCESS_POLICY_DENIED:${userId}`);
      policyErr.isAccessPolicy = true;
      policyErr.userId = userId;
      throw policyErr;
    }

    // 404 — user doesn't exist or no meetings, skip
    if (code === 404) {
      return null;
    }

    // Log but don't throw for other unexpected errors
    console.error(`[graphService] Unexpected error finding meeting for user ${userId}:`, msg);
    return null;
  }

  return null;
}

module.exports = { getMeetingTranscript, parseVTT };
