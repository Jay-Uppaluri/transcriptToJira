const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const adoTicketPromptTemplate = fs.readFileSync(
  path.join(__dirname, 'prompts/adoTicketPrompt.txt'),
  'utf-8'
).trim();

/**
 * Generate Azure DevOps work items from a PRD using GPT-4o.
 * @param {string} prd - The PRD content
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ workItems: Array }>}
 */
async function generateWorkItems(prd, apiKey) {
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    messages: [
      { role: 'system', content: adoTicketPromptTemplate },
      { role: 'user', content: `Here is the PRD:\n\n${prd}` },
    ],
  });

  let content = completion.choices[0].message.content;
  content = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
  const workItems = JSON.parse(content);
  return { workItems };
}

/**
 * Build Azure DevOps patch document from a work item object.
 * @param {object} workItem - Work item with title, description, priority, tags, etc.
 * @param {string} areaPath - Area path override (from config or user input)
 * @param {string} iterationPath - Iteration path override
 * @returns {Array} JSON Patch document for ADO API
 */
function buildPatchDocument(workItem, areaPath, iterationPath) {
  const ops = [
    { op: 'add', path: '/fields/System.Title', value: workItem.title },
  ];

  if (workItem.description) {
    ops.push({ op: 'add', path: '/fields/System.Description', value: workItem.description });
  }

  if (workItem.priority) {
    ops.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: workItem.priority });
  }

  if (workItem.tags) {
    ops.push({ op: 'add', path: '/fields/System.Tags', value: workItem.tags });
  }

  const effectiveAreaPath = workItem.areaPath || areaPath;
  if (effectiveAreaPath) {
    ops.push({ op: 'add', path: '/fields/System.AreaPath', value: effectiveAreaPath });
  }

  const effectiveIterationPath = workItem.iterationPath || iterationPath;
  if (effectiveIterationPath) {
    ops.push({ op: 'add', path: '/fields/System.IterationPath', value: effectiveIterationPath });
  }

  return ops;
}

/**
 * Create a single work item in Azure DevOps.
 * @param {object} workItem - Work item object
 * @param {object} auth - { orgUrl, project, pat }
 * @param {number|null} parentId - Parent work item ID to link to
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function createAdoWorkItem(workItem, auth, parentId = null) {
  const { orgUrl, project, pat } = auth;
  const encodedType = encodeURIComponent(`$${workItem.workItemType}`);
  const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/wit/workitems/${encodedType}?api-version=7.1`;

  const patchDoc = buildPatchDocument(workItem, auth.areaPath, auth.iterationPath);

  // Add parent link if provided
  if (parentId) {
    patchDoc.push({
      op: 'add',
      path: '/relations/-',
      value: {
        rel: 'System.LinkTypes.Hierarchy-Reverse',
        url: `${orgUrl}/_apis/wit/workItems/${parentId}`,
        attributes: { comment: 'Auto-linked by Cortex bot' },
      },
    });
  }

  try {
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json-patch+json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(patchDoc),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    }

    const errorMsg = data.message || data.typeKey || `HTTP ${response.status}`;
    return { success: false, error: errorMsg, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Submit work items to Azure DevOps, respecting parent-child relationships.
 * @param {Array} workItems - Array of work item objects (with parentIndex)
 * @param {object} auth - { orgUrl, project, pat, areaPath?, iterationPath? }
 * @returns {Promise<{ created: number, failed: number, total: number, results: Array }>}
 */
async function submitToAdo(workItems, auth) {
  const results = [];
  const createdIds = []; // maps index → ADO work item ID

  for (let i = 0; i < workItems.length; i++) {
    const wi = workItems[i];
    const parentIndex = wi.parentIndex;
    const parentId = (parentIndex !== null && parentIndex !== undefined && createdIds[parentIndex])
      ? createdIds[parentIndex]
      : null;

    const result = await createAdoWorkItem(wi, auth, parentId);
    result.title = wi.title;
    result.workItemType = wi.workItemType;

    if (result.success) {
      createdIds[i] = result.data.id;
      result.workItemId = result.data.id;
      result.workItemUrl = result.data._links?.html?.href ||
        `${auth.orgUrl}/${encodeURIComponent(auth.project)}/_workitems/edit/${result.data.id}`;
    } else {
      createdIds[i] = null;
      // Retry without parent link
      if (parentId) {
        console.log(`[ado] Retrying "${wi.title}" without parent link...`);
        const retry = await createAdoWorkItem(wi, auth, null);
        retry.title = wi.title;
        retry.workItemType = wi.workItemType;
        if (retry.success) {
          createdIds[i] = retry.data.id;
          retry.workItemId = retry.data.id;
          retry.workItemUrl = retry.data._links?.html?.href ||
            `${auth.orgUrl}/${encodeURIComponent(auth.project)}/_workitems/edit/${retry.data.id}`;
        }
        results.push(retry);
        continue;
      }
    }

    results.push(result);
  }

  const created = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  return { created, failed, total: workItems.length, results };
}

/**
 * Build ADO auth config from environment variables.
 * @returns {{ orgUrl: string, project: string, pat: string }}
 */
function buildAdoAuthFromEnv() {
  const orgUrl = process.env.ADO_ORG_URL;
  const project = process.env.ADO_PROJECT;
  const pat = process.env.ADO_PAT;

  if (!orgUrl || !project || !pat) {
    throw new Error('Azure DevOps credentials not configured. Set ADO_ORG_URL, ADO_PROJECT, and ADO_PAT.');
  }

  return { orgUrl, project, pat };
}

module.exports = { generateWorkItems, submitToAdo, buildAdoAuthFromEnv, buildPatchDocument };
