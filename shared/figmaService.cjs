// Figma REST API wrapper — shared between Express server and Teams bot

const FIGMA_API = 'https://api.figma.com/v1';

/**
 * Make an authenticated Figma API request
 */
async function figmaFetch(path, accessToken, options = {}) {
  const url = path.startsWith('http') ? path : `${FIGMA_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Figma API error (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Get current user info
 */
async function getCurrentUser(accessToken) {
  return figmaFetch('/me', accessToken);
}

/**
 * Get current user's recent files by traversing teams → projects → files.
 * Note: This requires projects:read scope AND a team-level Figma plan.
 * For personal/starter accounts, this will return an empty list —
 * users should share Figma URLs directly instead.
 */
async function getRecentFiles(accessToken) {
  const me = await figmaFetch('/me', accessToken);
  const files = [];

  const teamIds = [];
  if (me.team_ids && me.team_ids.length > 0) {
    teamIds.push(...me.team_ids);
  } else if (me.teams && me.teams.length > 0) {
    teamIds.push(...me.teams.map(t => t.id));
  }

  if (teamIds.length === 0) {
    console.log('[figma] No teams found on account — file listing requires a team plan or sharing Figma URLs directly');
    return [];
  }

  for (const teamId of teamIds.slice(0, 3)) {
    try {
      const projects = await figmaFetch(`/teams/${teamId}/projects`, accessToken);
      for (const project of (projects.projects || []).slice(0, 5)) {
        try {
          const projectFiles = await figmaFetch(`/projects/${project.id}/files`, accessToken);
          for (const file of (projectFiles.files || [])) {
            files.push({
              key: file.key,
              name: file.name,
              thumbnail_url: file.thumbnail_url,
              last_modified: file.last_modified,
              project_name: project.name,
              team_id: teamId,
            });
          }
        } catch (e) { console.log(`[figma] Skip project ${project.id}: ${e.message}`); }
      }
    } catch (e) { console.log(`[figma] Skip team ${teamId}: ${e.message}`); }
  }

  files.sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
  return files.slice(0, 20);
}

/**
 * Get a file's structure (pages and top-level frames)
 */
async function getFileStructure(accessToken, fileKey) {
  const data = await figmaFetch(`/files/${fileKey}?depth=2`, accessToken);
  const pages = (data.document?.children || []).map(page => ({
    id: page.id,
    name: page.name,
    type: page.type,
    frames: (page.children || [])
      .filter(child => child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'SECTION')
      .map(frame => ({
        id: frame.id,
        name: frame.name,
        type: frame.type,
        width: frame.absoluteBoundingBox?.width,
        height: frame.absoluteBoundingBox?.height,
      })),
  }));
  return {
    name: data.name,
    lastModified: data.lastModified,
    version: data.version,
    pages,
  };
}

/**
 * Get specific nodes from a file
 */
async function getNodes(accessToken, fileKey, nodeIds) {
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  const data = await figmaFetch(`/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`, accessToken);
  return data.nodes || {};
}

/**
 * Get rendered images of nodes
 */
async function getNodeImages(accessToken, fileKey, nodeIds, options = {}) {
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  const params = new URLSearchParams({
    ids,
    format: options.format || 'png',
    scale: String(options.scale || 2),
  });
  const data = await figmaFetch(`/images/${fileKey}?${params}`, accessToken);
  return data.images || {};
}

/**
 * Post a comment on a Figma file
 */
async function postComment(accessToken, fileKey, message, options = {}) {
  const body = { message };
  if (options.nodeId) {
    // Comment on a specific node
    body.client_meta = { node_id: options.nodeId };
  }
  if (options.x !== undefined && options.y !== undefined) {
    body.client_meta = {
      ...(body.client_meta || {}),
      node_offset: { x: options.x, y: options.y },
    };
  }
  return figmaFetch(`/files/${fileKey}/comments`, accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Get comments on a Figma file
 */
async function getComments(accessToken, fileKey) {
  const data = await figmaFetch(`/files/${fileKey}/comments`, accessToken);
  return data.comments || [];
}

/**
 * Get text content from nodes (useful for reading text in frames)
 */
async function getTextContent(accessToken, fileKey, nodeIds) {
  const nodes = await getNodes(accessToken, fileKey, nodeIds);
  const textNodes = [];

  function extractText(node) {
    if (node.type === 'TEXT') {
      textNodes.push({
        id: node.id,
        name: node.name,
        characters: node.characters,
        style: node.style,
      });
    }
    if (node.children) {
      for (const child of node.children) {
        extractText(child);
      }
    }
  }

  for (const [id, nodeData] of Object.entries(nodes)) {
    if (nodeData.document) {
      extractText(nodeData.document);
    }
  }

  return textNodes;
}

/**
 * Parse a Figma URL to extract file key and optional node ID
 */
function parseFigmaUrl(url) {
  // Matches: https://www.figma.com/file/FILEKEY/FileName?node-id=NODEID
  // Also: https://www.figma.com/design/FILEKEY/FileName?node-id=NODEID
  const fileMatch = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  if (!fileMatch) return null;

  const result = { fileKey: fileMatch[1] };

  const nodeMatch = url.match(/node-id=([^&]+)/);
  if (nodeMatch) {
    result.nodeId = decodeURIComponent(nodeMatch[1]);
  }

  return result;
}

// ─── Figma Plugin Command Queue ───

// In-memory command queue for Figma plugin communication
// In production, this would be in the database
const commandQueue = new Map(); // fileKey -> [{ id, command, params, status, result, createdAt }]

/**
 * Queue a command for the Figma plugin to execute
 */
function queuePluginCommand(fileKey, command, params = {}) {
  if (!commandQueue.has(fileKey)) {
    commandQueue.set(fileKey, []);
  }
  const cmd = {
    id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    command,
    params,
    status: 'pending',
    result: null,
    createdAt: Date.now(),
  };
  commandQueue.get(fileKey).push(cmd);
  return cmd.id;
}

/**
 * Get pending commands for a file (called by Figma plugin polling)
 */
function getPendingCommands(fileKey) {
  const commands = commandQueue.get(fileKey) || [];
  return commands.filter(c => c.status === 'pending');
}

/**
 * Mark a command as completed (called by Figma plugin after execution)
 */
function completeCommand(fileKey, commandId, result) {
  const commands = commandQueue.get(fileKey) || [];
  const cmd = commands.find(c => c.id === commandId);
  if (cmd) {
    cmd.status = 'completed';
    cmd.result = result;
  }
}

/**
 * Get the status/result of a command
 */
function getCommandStatus(fileKey, commandId) {
  const commands = commandQueue.get(fileKey) || [];
  return commands.find(c => c.id === commandId) || null;
}

// Clean up old commands every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000; // 30 min TTL
  for (const [fileKey, commands] of commandQueue) {
    const filtered = commands.filter(c => c.createdAt > cutoff);
    if (filtered.length === 0) {
      commandQueue.delete(fileKey);
    } else {
      commandQueue.set(fileKey, filtered);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  figmaFetch,
  getCurrentUser,
  getRecentFiles,
  getFileStructure,
  getNodes,
  getNodeImages,
  postComment,
  getComments,
  getTextContent,
  parseFigmaUrl,
  queuePluginCommand,
  getPendingCommands,
  completeCommand,
  getCommandStatus,
};
