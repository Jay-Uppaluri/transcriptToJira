// Cortex Figma Plugin — polls for commands from the Cortex server and executes them

const POLL_INTERVAL = 3000; // 3 seconds
let SERVER_URL = 'http://localhost:3010';
let polling = false;
let fileKey = '';

// Show the plugin UI
figma.showUI(__html__, { width: 320, height: 400 });

// Get the current file key from the file name (plugin can't directly access the file key)
// The user will need to provide the server URL and file key via the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'start-polling') {
    SERVER_URL = msg.serverUrl || SERVER_URL;
    fileKey = msg.fileKey;
    polling = true;
    figma.ui.postMessage({ type: 'status', status: 'connected', fileKey });
    pollForCommands();
  }

  if (msg.type === 'stop-polling') {
    polling = false;
    figma.ui.postMessage({ type: 'status', status: 'disconnected' });
  }
};

async function pollForCommands() {
  while (polling) {
    try {
      const response = await fetch(`${SERVER_URL}/api/figma/plugin/commands/${fileKey}`);
      const data = await response.json();

      if (data.commands && data.commands.length > 0) {
        for (const cmd of data.commands) {
          figma.ui.postMessage({ type: 'command-received', command: cmd });
          const result = await executeCommand(cmd);
          // Report completion
          await fetch(`${SERVER_URL}/api/figma/plugin/commands/${fileKey}/${cmd.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result }),
          });
          figma.ui.postMessage({ type: 'command-completed', commandId: cmd.id, result });
        }
      }
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: err.message });
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

async function executeCommand(cmd) {
  try {
    switch (cmd.command) {
      case 'createFrame':
        return await createFrame(cmd.params);
      case 'editText':
        return await editText(cmd.params);
      case 'createDesign':
        return await createDesign(cmd.params);
      case 'deleteNode':
        return await deleteNode(cmd.params);
      case 'moveNode':
        return await moveNode(cmd.params);
      default:
        return { success: false, error: `Unknown command: ${cmd.command}` };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Command Implementations ───

async function createFrame(params) {
  const { name, width, height, x, y, parentId } = params;
  const frame = figma.createFrame();
  frame.name = name || 'New Frame';
  frame.resize(width || 375, height || 812);
  frame.x = x || 0;
  frame.y = y || 0;

  if (parentId) {
    const parent = figma.getNodeById(parentId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(frame);
    }
  }

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);

  return { success: true, nodeId: frame.id, name: frame.name };
}

async function editText(params) {
  const { nodeId, instruction } = params;
  let targetNode;

  if (nodeId) {
    targetNode = figma.getNodeById(nodeId);
  } else {
    // Find text nodes in current selection or page
    const selection = figma.currentPage.selection;
    if (selection.length > 0) {
      targetNode = findTextNodes(selection[0])[0];
    }
  }

  if (!targetNode) {
    return { success: false, error: 'No text node found. Please select a frame or provide a node ID.' };
  }

  // If the target is a text node, update it
  if (targetNode.type === 'TEXT') {
    await figma.loadFontAsync(targetNode.fontName);
    // The instruction could be the new text or a description of the change
    // For now, treat it as the new text value
    targetNode.characters = instruction;
    return { success: true, nodeId: targetNode.id, newText: instruction };
  }

  // If the target contains text nodes, find and update them
  const textNodes = findTextNodes(targetNode);
  if (textNodes.length === 0) {
    return { success: false, error: 'No text nodes found in the specified node.' };
  }

  // Update the first text node (for simple cases)
  const firstText = textNodes[0];
  await figma.loadFontAsync(firstText.fontName);
  firstText.characters = instruction;
  return { success: true, nodeId: firstText.id, newText: instruction };
}

async function createDesign(params) {
  const { instruction, nodeId } = params;
  // This is a placeholder for AI-driven design creation
  // In a full implementation, this would:
  // 1. Send the instruction to GPT-4o to get design specifications
  // 2. Create the frames, text, shapes etc. based on the specs
  // For now, create a basic frame with the instruction as a text label

  const frame = figma.createFrame();
  frame.name = instruction.substring(0, 50) || 'AI Design';
  frame.resize(375, 812);
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

  // Add a text label
  const text = figma.createText();
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  text.characters = `Design request: ${instruction}`;
  text.fontSize = 14;
  text.x = 20;
  text.y = 20;
  text.resize(335, 100);
  frame.appendChild(text);

  if (nodeId) {
    const parent = figma.getNodeById(nodeId);
    if (parent && 'appendChild' in parent) {
      parent.appendChild(frame);
    }
  }

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);

  return { success: true, nodeId: frame.id, name: frame.name };
}

async function deleteNode(params) {
  const { nodeId } = params;
  if (!nodeId) return { success: false, error: 'Node ID required' };

  const node = figma.getNodeById(nodeId);
  if (!node) return { success: false, error: 'Node not found' };

  const name = node.name;
  node.remove();
  return { success: true, deletedNode: name };
}

async function moveNode(params) {
  const { nodeId, x, y } = params;
  if (!nodeId) return { success: false, error: 'Node ID required' };

  const node = figma.getNodeById(nodeId);
  if (!node) return { success: false, error: 'Node not found' };

  if (x !== undefined) node.x = x;
  if (y !== undefined) node.y = y;
  return { success: true, nodeId: node.id, x: node.x, y: node.y };
}

// ─── Helpers ───

function findTextNodes(node) {
  const textNodes = [];
  if (node.type === 'TEXT') {
    textNodes.push(node);
  }
  if ('children' in node) {
    for (const child of node.children) {
      textNodes.push(...findTextNodes(child));
    }
  }
  return textNodes;
}
