const config = require('../config');

// ─── Color & Icon Constants ───
const ACCENT = 'Accent';
const GOOD = 'Good';
const ATTENTION = 'Attention';
const WARNING = 'Warning';

// Unicode icons (Adaptive Cards don't support images inline easily)
const ICON = {
  doc: '📄',
  ticket: '🎫',
  jira: '🔗',
  check: '✅',
  cross: '❌',
  clock: '⏳',
  rocket: '🚀',
  wave: '👋',
  help: '💡',
  error: '⚠️',
  retry: '🔄',
  epic: '🏔️',
  story: '📖',
  task: '✏️',
  bug: '🐛',
  sparkle: '✨',
};

const ISSUE_ICON = {
  Epic: ICON.epic,
  Story: ICON.story,
  Task: ICON.task,
  Bug: ICON.bug,
};

// ─── Shared Helpers ───

function divider() {
  return {
    type: 'ColumnSet',
    spacing: 'Small',
    separator: true,
    columns: [],
  };
}

function spacer(size = 'Medium') {
  return { type: 'TextBlock', text: ' ', spacing: size, size: 'Small' };
}

function headerBlock(icon, title, subtitle) {
  const items = [
    {
      type: 'TextBlock',
      text: `${icon}  ${title}`,
      weight: 'Bolder',
      size: 'Large',
      wrap: true,
    },
  ];
  if (subtitle) {
    items.push({
      type: 'TextBlock',
      text: subtitle,
      wrap: true,
      isSubtle: true,
      spacing: 'Small',
    });
  }
  return items;
}

function card(body, actions) {
  const content = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    msteams: { width: 'Full' },
    body,
  };
  if (actions && actions.length) content.actions = actions;
  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content,
  };
}

// ─── Welcome Card ───

function buildWelcomeCard() {
  return card([
    ...headerBlock(ICON.wave, 'Welcome to Transcript → Jira!', null),
    {
      type: 'TextBlock',
      text: 'I turn meeting transcripts into **professional PRDs** and **Jira tickets** — in seconds.',
      wrap: true,
      spacing: 'Medium',
    },
    divider(),
    {
      type: 'TextBlock',
      text: '**Quick Start**',
      weight: 'Bolder',
      spacing: 'Medium',
    },
    {
      type: 'FactSet',
      spacing: 'Small',
      facts: [
        { title: `${ICON.doc} Paste transcript`, value: '/prd-from-text <transcript>' },
        { title: `${ICON.jira} From meeting URL`, value: '/generate-prd <teams-url>' },
        { title: `${ICON.help} Get help`, value: '/help' },
      ],
    },
    {
      type: 'TextBlock',
      text: 'Or just **chat with me** — I can answer questions about your projects, processes, and more.',
      wrap: true,
      spacing: 'Medium',
      isSubtle: true,
    },
  ]);
}

// ─── Help Card ───

function buildHelpCard() {
  return card([
    ...headerBlock(ICON.help, 'Commands & Help', null),
    divider(),
    {
      type: 'TextBlock',
      text: '**Commands**',
      weight: 'Bolder',
      spacing: 'Medium',
    },
    {
      type: 'FactSet',
      spacing: 'Small',
      facts: [
        { title: '/prd-from-text <transcript>', value: 'Generate a PRD from pasted transcript text' },
        { title: '/generate-prd <meeting-url>', value: 'Fetch transcript from Teams meeting URL and generate PRD' },
        { title: '/help', value: 'Show this help card' },
      ],
    },
    divider(),
    {
      type: 'TextBlock',
      text: '**Workflow**',
      weight: 'Bolder',
      spacing: 'Medium',
    },
    {
      type: 'TextBlock',
      text: `1. Paste transcript or provide meeting URL → Review the **Summary**\n2. Confirm summary → I generate a **PRD**\n3. Chat to **edit the PRD** until you're happy\n4. Click **Generate Jira Tickets** → Review **drafts**\n5. Edit tickets, toggle off any you don't want → **Push to Jira**\n\nYou can also just chat with me for general questions.`,
      wrap: true,
      spacing: 'Small',
    },
    {
      type: 'TextBlock',
      text: `${ICON.sparkle} *Powered by GPT-4o • Jira project: ${config.jiraProjectKey}*`,
      wrap: true,
      spacing: 'Medium',
      isSubtle: true,
      size: 'Small',
    },
  ]);
}

// ─── Progress Card ───

function buildProgressCard(message, step, totalSteps) {
  const body = [
    {
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          width: 'auto',
          items: [{ type: 'TextBlock', text: ICON.clock, size: 'Large' }],
          verticalContentAlignment: 'Center',
        },
        {
          type: 'Column',
          width: 'stretch',
          items: [
            {
              type: 'TextBlock',
              text: message,
              wrap: true,
              weight: 'Bolder',
            },
            ...(step && totalSteps ? [{
              type: 'TextBlock',
              text: `Step ${step} of ${totalSteps}`,
              isSubtle: true,
              size: 'Small',
              spacing: 'None',
            }] : [{
              type: 'TextBlock',
              text: 'This may take 20-30 seconds...',
              isSubtle: true,
              size: 'Small',
              spacing: 'None',
            }]),
          ],
        },
      ],
    },
  ];
  return card(body);
}

// ─── Error Card ───

function buildErrorCard(errorMessage, retryAction, retryData) {
  const body = [
    {
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          width: 'auto',
          items: [{ type: 'TextBlock', text: ICON.error, size: 'Large' }],
          verticalContentAlignment: 'Center',
        },
        {
          type: 'Column',
          width: 'stretch',
          items: [
            {
              type: 'TextBlock',
              text: 'Something went wrong',
              weight: 'Bolder',
              size: 'Medium',
              color: ATTENTION,
            },
            {
              type: 'TextBlock',
              text: errorMessage || 'An unexpected error occurred.',
              wrap: true,
              spacing: 'Small',
            },
          ],
        },
      ],
    },
  ];

  const actions = [];
  if (retryAction && retryData) {
    actions.push({
      type: 'Action.Submit',
      title: `${ICON.retry} Try Again`,
      data: { action: retryAction, ...retryData },
      style: 'positive',
    });
  }

  return card(body, actions);
}

// ─── Summary Card ───

function buildSummaryCard(summary, meetingSubject, dataId, sourceType) {
  const sections = parsePRDSections(summary);

  const body = [
    ...headerBlock(ICON.doc, `Meeting Summary: ${meetingSubject}`, 'Review before generating PRD'),
    divider(),
  ];

  if (sections.length > 1) {
    for (const section of sections) {
      if (section.title) {
        body.push({
          type: 'TextBlock',
          text: `**${section.title}**`,
          wrap: true,
          spacing: 'Medium',
          weight: 'Bolder',
          size: 'Medium',
        });
      }
      body.push({
        type: 'TextBlock',
        text: section.content,
        wrap: true,
        spacing: 'Small',
      });
    }
  } else {
    body.push({
      type: 'TextBlock',
      text: summary,
      wrap: true,
      spacing: 'Medium',
    });
  }

  body.push(divider());
  body.push({
    type: 'TextBlock',
    text: '💬 Add any notes or context to include in the PRD (optional):',
    wrap: true,
    spacing: 'Medium',
    isSubtle: true,
  });
  body.push({
    type: 'Input.Text',
    id: 'additionalNotes',
    placeholder: 'e.g., "Focus on the mobile experience", "Include API rate limiting requirements"',
    isMultiline: true,
  });
  body.push({
    type: 'Input.Text',
    id: 'projectKey',
    label: 'Jira Project Key',
    value: config.jiraProjectKey,
    placeholder: 'e.g., KAN',
  });

  return card(body, [
    {
      type: 'Action.Submit',
      title: `${ICON.check} Confirm & Generate PRD`,
      data: { action: 'confirmSummary', dataId, sourceType },
      style: 'positive',
    },
  ]);
}

// ─── PRD Card ───

function buildPRDCard(prdContent, meetingSubject, prdId) {
  // Split PRD into sections for collapsible display
  const sections = parsePRDSections(prdContent);
  const preview = prdContent.length > 3000
    ? prdContent.substring(0, 3000) + '\n\n*... (truncated for display — full PRD used for ticket generation)*'
    : prdContent;

  const body = [
    ...headerBlock(ICON.doc, `PRD: ${meetingSubject}`, `Generated from meeting transcript`),
    divider(),
  ];

  // If we can parse sections, show them nicely
  if (sections.length > 1) {
    for (const section of sections) {
      if (section.title) {
        body.push({
          type: 'TextBlock',
          text: `**${section.title}**`,
          wrap: true,
          spacing: 'Medium',
          weight: 'Bolder',
          size: 'Medium',
        });
      }
      body.push({
        type: 'TextBlock',
        text: section.content,
        wrap: true,
        spacing: 'Small',
      });
    }
  } else {
    body.push({
      type: 'TextBlock',
      text: preview,
      wrap: true,
      spacing: 'Medium',
    });
  }

  body.push(divider());
  body.push({
    type: 'TextBlock',
    text: '💬 **Want to make changes?** Reply with edit instructions (e.g., "add a security section", "remove the timeline", "make the user stories more detailed").',
    wrap: true,
    spacing: 'Medium',
  });
  body.push({
    type: 'TextBlock',
    text: `${ICON.ticket} When you're happy with the PRD, generate Jira tickets:`,
    wrap: true,
    spacing: 'Medium',
    isSubtle: true,
  });
  body.push({
    type: 'Input.Text',
    id: 'projectKey',
    label: 'Jira Project Key',
    value: config.jiraProjectKey,
    placeholder: 'e.g., KAN',
  });

  return card(body, [
    {
      type: 'Action.Submit',
      title: `${ICON.ticket} Generate Jira Tickets`,
      data: { action: 'generateTickets', prdId },
      style: 'positive',
    },
  ]);
}

// Parse PRD markdown into sections (by ## headers)
function parsePRDSections(prd) {
  const lines = prd.split('\n');
  const sections = [];
  let current = { title: '', content: '' };

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      if (current.title || current.content.trim()) {
        sections.push({ title: current.title, content: current.content.trim() });
      }
      current = { title: headerMatch[1], content: '' };
    } else {
      current.content += line + '\n';
    }
  }
  if (current.title || current.content.trim()) {
    sections.push({ title: current.title, content: current.content.trim() });
  }

  // Truncate long sections
  return sections.map(s => ({
    title: s.title,
    content: s.content.length > 500
      ? s.content.substring(0, 500) + '\n\n*... (section truncated)*'
      : s.content,
  }));
}

// ─── Ticket Drafts Card (with toggles and edit buttons) ───

function buildTicketDraftsCard(tickets, projectKey, ticketsId) {
  const counts = {};
  for (const t of tickets) {
    const type = t.fields?.issuetype?.name || 'Task';
    counts[type] = (counts[type] || 0) + 1;
  }

  const summaryParts = Object.entries(counts)
    .map(([type, count]) => `${ISSUE_ICON[type] || '📋'} ${count} ${type}${count > 1 ? 's' : ''}`)
    .join('  •  ');

  const body = [
    ...headerBlock(ICON.ticket, 'Ticket Drafts', `${tickets.length} tickets ready for review`),
    {
      type: 'TextBlock',
      text: summaryParts,
      wrap: true,
      spacing: 'Small',
    },
    {
      type: 'TextBlock',
      text: 'Toggle tickets on/off to include or exclude them. Click **Edit** to modify a ticket.',
      wrap: true,
      spacing: 'Small',
      isSubtle: true,
    },
    divider(),
  ];

  // Flat list with toggles and edit buttons
  let ticketIndex = 0;
  const grouped = {};
  const indexMap = {}; // type -> [originalIndex]
  for (let i = 0; i < tickets.length; i++) {
    const type = tickets[i].fields?.issuetype?.name || 'Task';
    if (!grouped[type]) { grouped[type] = []; indexMap[type] = []; }
    grouped[type].push(tickets[i]);
    indexMap[type].push(i);
  }

  for (const [type, items] of Object.entries(grouped)) {
    body.push({
      type: 'TextBlock',
      text: `${ISSUE_ICON[type] || '📋'} **${type}s**`,
      weight: 'Bolder',
      spacing: 'Medium',
    });

    for (let j = 0; j < items.length; j++) {
      const t = items[j];
      const idx = indexMap[type][j];
      const priority = t.fields?.priority?.name || 'Medium';
      const priorityIcon = priority === 'High' || priority === 'Highest' ? '🔴'
        : priority === 'Low' || priority === 'Lowest' ? '🔵' : '🟡';

      const description = adfToPlainText(t.fields?.description);
      const descriptionPreview = description.length > 150
        ? description.substring(0, 150) + '...'
        : description;

      // Ticket container with emphasis style for visual separation
      const ticketItems = [];

      // Row: Checkbox + Title + Description (same column) + Priority
      ticketItems.push({
        type: 'ColumnSet',
        spacing: 'None',
        columns: [
          {
            type: 'Column',
            width: 'auto',
            items: [{
              type: 'Input.Toggle',
              id: `include_${idx}`,
              title: '',
              value: 'true',
              valueOn: 'true',
              valueOff: 'false',
            }],
            verticalContentAlignment: 'Center',
          },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: `**${t.fields?.summary || 'Untitled'}**`,
                wrap: true,
              },
              ...(descriptionPreview ? [{
                type: 'TextBlock',
                text: descriptionPreview,
                wrap: true,
                size: 'Small',
                isSubtle: true,
                spacing: 'None',
              }] : []),
            ],
            verticalContentAlignment: 'Center',
          },
          {
            type: 'Column',
            width: 'auto',
            items: [{
              type: 'TextBlock',
              text: `${priorityIcon} ${priority}`,
              isSubtle: true,
              size: 'Small',
            }],
            verticalContentAlignment: 'Center',
          },
        ],
      });

      body.push({
        type: 'Container',
        style: 'emphasis',
        bleed: false,
        roundedCorners: true,
        spacing: 'Medium',
        items: ticketItems,
      });
    }
  }

  body.push(divider());
  body.push({
    type: 'TextBlock',
    text: `Target project: **${projectKey}**`,
    isSubtle: true,
    spacing: 'Medium',
    size: 'Small',
  });

  const actions = [];

  // Edit buttons per ticket as a single Action.Submit
  actions.push({
    type: 'Action.Submit',
    title: `${ICON.task} Edit Tickets`,
    data: { action: 'showEditMenu', ticketsId, projectKey },
  });

  actions.push({
    type: 'Action.Submit',
    title: `${ICON.jira} Push Selected to Jira`,
    data: { action: 'submitSelectedToJira', ticketsId, projectKey },
    style: 'positive',
  });

  return card(body, actions);
}

// ─── Edit Ticket Menu Card (pick which ticket to edit) ───

function buildEditTicketMenuCard(tickets, ticketsId, projectKey) {
  const body = [
    ...headerBlock(ICON.task, 'Edit Tickets', 'Select a ticket to edit'),
    divider(),
  ];

  const actions = [];
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    const type = t.fields?.issuetype?.name || 'Task';
    const icon = ISSUE_ICON[type] || '📋';
    actions.push({
      type: 'Action.Submit',
      title: `${icon} ${t.fields?.summary || 'Untitled'}`,
      data: { action: 'editTicket', ticketsId, ticketIndex: i, projectKey },
    });
  }

  actions.push({
    type: 'Action.Submit',
    title: `${ICON.retry} Back to Drafts`,
    data: { action: 'cancelTicketEdit', ticketsId, projectKey },
  });

  return card(body, actions);
}

// ─── Edit Single Ticket Card ───

function buildEditTicketCard(ticket, ticketIndex, ticketsId, projectKey) {
  const summary = ticket.fields?.summary || '';
  const priority = ticket.fields?.priority?.name || 'Medium';
  const type = ticket.fields?.issuetype?.name || 'Task';
  const description = adfToPlainText(ticket.fields?.description);

  const body = [
    ...headerBlock(ICON.task, `Edit: ${type}`, summary),
    divider(),
    {
      type: 'Input.Text',
      id: 'editTitle',
      label: 'Title',
      value: summary,
      placeholder: 'Ticket title',
    },
    {
      type: 'Input.Text',
      id: 'editDescription',
      label: 'Description',
      value: description,
      placeholder: 'Ticket description',
      isMultiline: true,
    },
    {
      type: 'Input.ChoiceSet',
      id: 'editPriority',
      label: 'Priority',
      value: priority,
      choices: [
        { title: '🔴 Highest', value: 'Highest' },
        { title: '🔴 High', value: 'High' },
        { title: '🟡 Medium', value: 'Medium' },
        { title: '🔵 Low', value: 'Low' },
        { title: '🔵 Lowest', value: 'Lowest' },
      ],
    },
  ];

  return card(body, [
    {
      type: 'Action.Submit',
      title: `${ICON.check} Save Changes`,
      data: { action: 'saveTicketEdit', ticketsId, ticketIndex, projectKey },
      style: 'positive',
    },
    {
      type: 'Action.Submit',
      title: 'Cancel',
      data: { action: 'cancelTicketEdit', ticketsId, projectKey },
    },
  ]);
}

// ─── ADF Conversion Helpers ───

function adfToPlainText(adfDoc) {
  if (!adfDoc || !adfDoc.content) return '';

  function extractText(nodes) {
    let text = '';
    for (const node of nodes) {
      if (node.type === 'text') {
        text += node.text || '';
      } else if (node.type === 'hardBreak') {
        text += '\n';
      } else if (node.type === 'paragraph') {
        text += extractText(node.content || []) + '\n';
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        for (const item of (node.content || [])) {
          text += '• ' + extractText(item.content || []);
        }
      } else if (node.type === 'listItem') {
        text += extractText(node.content || []);
      } else if (node.type === 'heading') {
        text += extractText(node.content || []) + '\n';
      } else if (node.content) {
        text += extractText(node.content);
      }
    }
    return text;
  }

  return extractText(adfDoc.content).trim();
}

function plainTextToAdf(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const content = lines.map(line => ({
    type: 'paragraph',
    content: [{ type: 'text', text: line }],
  }));

  return {
    type: 'doc',
    version: 1,
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }],
  };
}

// Legacy alias for backward compatibility
function buildTicketsCard(tickets, projectKey, ticketsId) {
  return buildTicketDraftsCard(tickets, projectKey, ticketsId);
}

// ─── Jira Result Card ───

function buildJiraResultCard(results) {
  const { created, failed, total } = results;
  const allGood = failed === 0;

  const body = [
    ...headerBlock(
      allGood ? ICON.check : ICON.error,
      allGood ? 'All Tickets Created!' : 'Jira Submission Complete',
      `${created} of ${total} tickets created successfully`
    ),
    divider(),
  ];

  // Success items
  const successes = results.results.filter(r => r.success);
  if (successes.length) {
    body.push({
      type: 'TextBlock',
      text: `${ICON.check} **Created**`,
      weight: 'Bolder',
      spacing: 'Medium',
    });
    for (const r of successes) {
      const key = r.data?.key || 'Unknown';
      const url = config.jiraBaseUrl ? `${config.jiraBaseUrl}/browse/${key}` : '#';
      body.push({
        type: 'TextBlock',
        text: `[${key}](${url}) — ${r.summary}`,
        wrap: true,
        spacing: 'Small',
      });
    }
  }

  // Failed items
  const failures = results.results.filter(r => !r.success);
  if (failures.length) {
    body.push({
      type: 'TextBlock',
      text: `${ICON.cross} **Failed**`,
      weight: 'Bolder',
      color: ATTENTION,
      spacing: 'Medium',
    });
    for (const r of failures) {
      body.push({
        type: 'TextBlock',
        text: `${r.summary} — *${r.error || 'Unknown error'}*`,
        wrap: true,
        color: ATTENTION,
        spacing: 'Small',
      });
    }
  }

  return card(body);
}

// ─── Input Validation Card ───

function buildValidationCard(message) {
  return card([
    {
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          width: 'auto',
          items: [{ type: 'TextBlock', text: '💬', size: 'Large' }],
          verticalContentAlignment: 'Center',
        },
        {
          type: 'Column',
          width: 'stretch',
          items: [
            { type: 'TextBlock', text: message, wrap: true },
          ],
        },
      ],
    },
  ]);
}

// ─── Figma Cards ───

function buildFigmaFilesCard(files) {
  const body = [
    ...headerBlock('🎨', 'Your Figma Files', `${files.length} recent files`),
    divider(),
  ];

  for (const file of files.slice(0, 10)) {
    const modified = file.last_modified ? new Date(file.last_modified).toLocaleDateString() : '';
    body.push({
      type: 'ColumnSet',
      spacing: 'Small',
      columns: [
        {
          type: 'Column',
          width: 'stretch',
          items: [
            {
              type: 'TextBlock',
              text: `**${file.name}**`,
              wrap: true,
            },
            {
              type: 'TextBlock',
              text: `${file.project_name || ''} ${modified ? `• ${modified}` : ''}`,
              size: 'Small',
              isSubtle: true,
              spacing: 'None',
              wrap: true,
            },
          ],
        },
        {
          type: 'Column',
          width: 'auto',
          items: [{
            type: 'TextBlock',
            text: `[Open](https://www.figma.com/file/${file.key})`,
            size: 'Small',
          }],
          verticalContentAlignment: 'Center',
        },
      ],
    });
  }

  return card(body);
}

function buildFigmaFramesCard(fileInfo, fileKey) {
  const body = [
    ...headerBlock('🎨', `Figma: ${fileInfo.name}`, `${fileInfo.pages.length} page(s)`),
    divider(),
  ];

  for (const page of fileInfo.pages) {
    body.push({
      type: 'TextBlock',
      text: `**📄 ${page.name}**`,
      spacing: 'Medium',
      weight: 'Bolder',
    });

    if (page.frames.length === 0) {
      body.push({
        type: 'TextBlock',
        text: '_No frames on this page_',
        isSubtle: true,
        spacing: 'Small',
      });
    } else {
      for (const frame of page.frames.slice(0, 10)) {
        const dims = frame.width && frame.height ? ` (${Math.round(frame.width)}×${Math.round(frame.height)})` : '';
        body.push({
          type: 'TextBlock',
          text: `• **${frame.name}**${dims} — ${frame.type}`,
          wrap: true,
          spacing: 'None',
          size: 'Small',
        });
      }
      if (page.frames.length > 10) {
        body.push({
          type: 'TextBlock',
          text: `_...and ${page.frames.length - 10} more frames_`,
          isSubtle: true,
          spacing: 'None',
          size: 'Small',
        });
      }
    }
  }

  body.push(divider());
  body.push({
    type: 'TextBlock',
    text: `[Open in Figma](https://www.figma.com/file/${fileKey})`,
    spacing: 'Medium',
  });

  return card(body);
}

function buildFigmaImageCard(imageUrl, frameName, fileKey) {
  const body = [
    ...headerBlock('🖼️', frameName || 'Figma Frame', 'Rendered preview'),
    divider(),
  ];

  if (imageUrl) {
    body.push({
      type: 'Image',
      url: imageUrl,
      size: 'Large',
      altText: frameName || 'Figma frame preview',
      spacing: 'Medium',
    });
  } else {
    body.push({
      type: 'TextBlock',
      text: '_Could not render this frame._',
      isSubtle: true,
      spacing: 'Medium',
    });
  }

  if (fileKey) {
    body.push({
      type: 'TextBlock',
      text: `[Open in Figma](https://www.figma.com/file/${fileKey})`,
      spacing: 'Medium',
      size: 'Small',
    });
  }

  return card(body);
}

function buildFigmaCommentCard(comment, fileKey) {
  const body = [
    ...headerBlock('💬', 'Comment Posted', `On Figma file`),
    divider(),
    {
      type: 'TextBlock',
      text: `**Message:** ${comment.message || 'Comment posted successfully'}`,
      wrap: true,
      spacing: 'Medium',
    },
  ];

  if (fileKey) {
    body.push({
      type: 'TextBlock',
      text: `[View in Figma](https://www.figma.com/file/${fileKey})`,
      spacing: 'Medium',
      size: 'Small',
    });
  }

  return card(body);
}

function buildFigmaCommandQueuedCard(commandId, command, fileKey) {
  const body = [
    ...headerBlock('🔧', 'Design Command Queued', 'Waiting for Figma plugin to execute'),
    divider(),
    {
      type: 'TextBlock',
      text: `**Command:** ${command}`,
      wrap: true,
      spacing: 'Medium',
    },
    {
      type: 'TextBlock',
      text: `**Status:** Pending — make sure the Cortex plugin is running in Figma`,
      wrap: true,
      spacing: 'Small',
      isSubtle: true,
    },
    {
      type: 'TextBlock',
      text: `Command ID: \`${commandId}\``,
      size: 'Small',
      isSubtle: true,
      spacing: 'Small',
    },
  ];

  if (fileKey) {
    body.push({
      type: 'TextBlock',
      text: `[Open in Figma](https://www.figma.com/file/${fileKey})`,
      spacing: 'Medium',
      size: 'Small',
    });
  }

  return card(body);
}

module.exports = {
  buildProgressCard,
  buildErrorCard,
  buildPRDCard,
  buildSummaryCard,
  buildTicketsCard,
  buildTicketDraftsCard,
  buildEditTicketMenuCard,
  buildEditTicketCard,
  buildJiraResultCard,
  buildWelcomeCard,
  buildHelpCard,
  buildValidationCard,
  adfToPlainText,
  plainTextToAdf,
  // Figma cards
  buildFigmaFilesCard,
  buildFigmaFramesCard,
  buildFigmaImageCard,
  buildFigmaCommentCard,
  buildFigmaCommandQueuedCard,
};
