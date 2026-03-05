/**
 * Test script — runs the full pipeline from a local VTT file.
 * Usage: node devTools/test-pipeline.js [--submit]
 *
 * --submit  Also submits generated tickets to Jira (skipped by default)
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load env vars from env/.env.local and env/.env.local.user
// Strips the SECRET_ prefix so keys match what config.js expects
// ---------------------------------------------------------------------------
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
    if (key.startsWith('SECRET_')) key = key.slice(7); // strip SECRET_ prefix
    if (!process.env[key]) process.env[key] = value;
  }
}

const envDir = path.join(__dirname, '..', 'env');
loadEnvFile(path.join(envDir, '.env.local'));
loadEnvFile(path.join(envDir, '.env.local.user'));

// ---------------------------------------------------------------------------
// Now import services (they read config which reads process.env)
// ---------------------------------------------------------------------------
const { parseVTT } = require('../src/services/graphService');
const { generatePRD } = require('../src/services/prdService');
const { generateTickets, submitToJira } = require('../src/services/ticketService');

const VTT_FILE = path.join(__dirname, 'sample.vtt');
const SUBMIT_TO_JIRA = process.argv.includes('--submit');

function separator(label) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${label}`);
  console.log(line);
}

async function main() {
  console.log('TeamsBot Pipeline Test');
  console.log('VTT file:', VTT_FILE);
  console.log('Submit to Jira:', SUBMIT_TO_JIRA);

  // Step 1: Parse VTT
  separator('Step 1 — Parsing VTT');
  const vttContent = fs.readFileSync(VTT_FILE, 'utf-8');
  const transcript = parseVTT(vttContent);
  console.log(transcript.slice(0, 500) + (transcript.length > 500 ? '\n...(truncated)' : ''));
  console.log(`\nTotal transcript length: ${transcript.length} characters`);

  // Step 2: Generate PRD
  separator('Step 2 — Generating PRD (GPT-4o)');
  console.log('Calling OpenAI...');
  const { prd } = await generatePRD(transcript);
  console.log(prd.slice(0, 800) + (prd.length > 800 ? '\n...(truncated)' : ''));
  console.log(`\nTotal PRD length: ${prd.length} characters`);

  // Step 3: Generate Jira tickets
  separator('Step 3 — Generating Jira Tickets (GPT-4o)');
  console.log('Calling OpenAI...');
  const projectKey = process.env.JIRA_PROJECT_KEY || 'KAN';
  const { tickets } = await generateTickets(prd, projectKey);
  console.log(`Generated ${tickets.length} tickets:`);
  tickets.forEach((t, i) => {
    const f = t.fields;
    console.log(`  [${i + 1}] [${f?.issuetype?.name || '?'}] [${f?.priority?.name || '?'}] ${f?.summary || '?'}`);
  });

  // Step 4: Submit to Jira (optional)
  if (SUBMIT_TO_JIRA) {
    separator('Step 4 — Submitting to Jira');
    console.log(`Submitting ${tickets.length} tickets to ${process.env.JIRA_BASE_URL}...`);
    const results = await submitToJira(tickets);
    console.log(`Created: ${results.created}  Failed: ${results.failed}  Total: ${results.total}`);
    results.results.forEach((r, i) => {
      const status = r.success ? '✓' : '✗';
      const detail = r.success ? (r.data?.key || '') : r.error || r.data?.errors;
      console.log(`  [${status}] ${r.summary} ${detail}`);
    });
  } else {
    separator('Step 4 — Jira submission skipped');
    console.log('Run with --submit to also push tickets to Jira.');
  }

  separator('Done');
}

main().catch(err => {
  console.error('\nPipeline failed:', err.message || err);
  process.exit(1);
});
