const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const config = require('../config');

require('isomorphic-fetch');

let graphClient = null;

function getGraphClient() {
  if (graphClient) return graphClient;

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
 * Fetch the meeting transcript given a Teams meeting join URL.
 * Returns { transcript: string, meetingSubject: string }
 */
async function getMeetingTranscript(joinUrl) {
  const client = getGraphClient();

  // Find the meeting by join URL using the /communications/onlineMeetings filter
  const meetingResponse = await client
    .api('/communications/onlineMeetings')
    .filter(`JoinWebUrl eq '${joinUrl}'`)
    .get();

  if (!meetingResponse.value || meetingResponse.value.length === 0) {
    throw new Error('Meeting not found. Please verify the join URL is correct and the meeting has ended.');
  }

  const meeting = meetingResponse.value[0];
  const meetingId = meeting.id;
  const meetingSubject = meeting.subject || 'Untitled Meeting';
  const organizerId = meeting.participants?.organizer?.identity?.user?.id;

  if (!organizerId) {
    throw new Error('Could not determine meeting organizer.');
  }

  // Fetch transcripts for the meeting
  const transcriptsResponse = await client
    .api(`/users/${organizerId}/onlineMeetings/${meetingId}/transcripts`)
    .get();

  if (!transcriptsResponse.value || transcriptsResponse.value.length === 0) {
    throw new Error('No transcripts found. Make sure transcription was enabled during the meeting and the transcript has finished processing.');
  }

  // Get the most recent transcript
  const transcript = transcriptsResponse.value[transcriptsResponse.value.length - 1];
  const transcriptId = transcript.id;

  // Fetch transcript content in VTT format
  const content = await client
    .api(`/users/${organizerId}/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content`)
    .query({ '$format': 'text/vtt' })
    .get();

  const parsedTranscript = parseVTT(content);

  return {
    transcript: parsedTranscript,
    meetingSubject,
  };
}

module.exports = { getMeetingTranscript, parseVTT };