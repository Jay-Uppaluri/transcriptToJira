/**
 * Checks the Azure app registration's configured Graph API permissions.
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    let key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key.startsWith('SECRET_')) key = key.slice(7);
    if (!process.env[key]) process.env[key] = value;
  }
}

const envDir = path.join(__dirname, '..', 'env');
loadEnvFile(path.join(envDir, '.env.local'));
loadEnvFile(path.join(envDir, '.env.local.user'));

const tenantId = process.env.TENANT_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.GRAPH_CLIENT_SECRET;

async function getToken() {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function main() {
  console.log('Checking app registration permissions...');
  console.log('Client ID:', clientId);
  console.log('Tenant ID:', tenantId);

  const token = await getToken();
  console.log('✓ Auth token obtained\n');

  // Get the app registration details
  const res = await fetch(`https://graph.microsoft.com/v1.0/applications?$filter=appId eq '${clientId}'&$select=displayName,requiredResourceAccess`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (!res.ok) {
    console.error('Failed to fetch app registration:', JSON.stringify(data, null, 2));
    console.log('\nNote: This requires Application.Read.All permission on the app registration.');
    return;
  }

  if (!data.value || data.value.length === 0) {
    console.log('App not found. The credentials may belong to a different tenant.');
    return;
  }

  const app = data.value[0];
  console.log('App name:', app.displayName);
  console.log('\nConfigured API permissions:');

  // Graph API resource ID
  const GRAPH_RESOURCE_ID = '00000003-0000-0000-c000-000000000000';

  if (!app.requiredResourceAccess || app.requiredResourceAccess.length === 0) {
    console.log('  ⚠ No API permissions configured on this app registration.');
    return;
  }

  for (const resource of app.requiredResourceAccess) {
    const resourceLabel = resource.resourceAppId === GRAPH_RESOURCE_ID ? 'Microsoft Graph' : resource.resourceAppId;
    console.log(`\n  Resource: ${resourceLabel}`);
    for (const perm of resource.resourceAccess) {
      console.log(`    - ${perm.type === 'Role' ? '[Application]' : '[Delegated]'} ID: ${perm.id}`);
    }
  }

  // Check specifically for transcript permission
  // OnlineMeetingTranscript.Read.All = 7ab7862c-4c57-491e-8a45-d52a7e023983
  const TRANSCRIPT_PERM_ID = '7ab7862c-4c57-491e-8a45-d52a7e023983';
  const graphResource = app.requiredResourceAccess?.find(r => r.resourceAppId === GRAPH_RESOURCE_ID);
  const hasTranscript = graphResource?.resourceAccess?.some(p => p.id === TRANSCRIPT_PERM_ID);

  console.log('\n────────────────────────────────────');
  console.log('OnlineMeetingTranscript.Read.All:', hasTranscript ? '✓ Configured' : '✗ NOT configured');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
