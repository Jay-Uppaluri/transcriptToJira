const config = require('../config');

// ─── Color & Icon Constants ───
const ACCENT = 'Accent';
const GOOD = 'Good';
const ATTENTION = 'Attention';
const WARNING = 'Warning';

// Unicode icons
const ICON = {
  doc: '📄',
  ticket: '🎫',
  link: '🔗',
  check: '✅',
  cross: '❌',
  clock: '⏳',
  rocket: '🚀',
  wave: '👋',
  help: '💡',
  error: '⚠️',
  retry: '🔄',
  epic: '🏔️',
  feature: '⭐',
  story: '📖',
  task: '✏️',
  bug: '🐛',
  sparkle: '✨',
};

const WORK_ITEM_ICON = {
  Epic: ICON.epic,
  Feature: ICON.feature,
  'User Story': ICON.story,
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
    ...headerBlock(ICON.wave, 'Welcome to Transcript → Azure DevOps!', null),
    {
      type: 'TextBlock',
      text: 'I turn meeting transcripts into **professional PRDs** and **Azure DevOps work items** — in seconds.',
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
        { title: `${ICON.link} From meeting URL`, value: '/generate-prd <teams-url>' },
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
      text: `1. Paste transcript or provide meeting URL → Review the **Summary**\n2. Confirm summary → I generate a **PRD**\n3. Chat to **edit the PRD** until you're happy\n4. Click **Generate Work Items** → Review **drafts**\n5. Edit work items, toggle off any you don't want → **Push to Azure DevOps**\n\nYou can also just chat with me for general questions.`,
      wrap: true,
      spacing: 'Small',
    },
    {
      type: 'TextBlock',
      text: `${ICON.sparkle} *Powered by GPT-4o • Azure DevOps: ${config.adoProject || '(not configured)'}*`,
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
  const sections = parsePRDSections(prdContent);
  const preview = prdContent.length > 3000
    ? prdContent.substring(0, 3000) + '\n\n*... (truncated for display — full PRD used for work item generation)*'
    : prdContent;

  const body = [
    ...headerBlock(ICON.doc, `PRD: ${meetingSubject}`, `Generated from meeting transcript`),
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
    text: `${ICON.ticket} When you're happy with the PRD, generate Azure DevOps work items:`,
    wrap: true,
    spacing: 'Medium',
    isSubtle: true,
  });

  return card(body, [
    {
      type: 'Action.Submit',
      title: `${ICON.ticket} Generate Work Items`,
      data: { action: 'generateWorkItems', prdId },
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

  return sections.map(s => ({
    title: s.title,
    content: s.content.length > 500
      ? s.content.substring(0, 500) + '\n\n*... (section truncated)*'
      : s.content,
  }));
}

// ─── Work Item Drafts Card (with toggles) ───

function buildWorkItemDraftsCard(workItems, workItemsId) {
  const counts = {};
  for (const wi of workItems) {
    const type = wi.workItemType || 'Task';
    counts[type] = (counts[type] || 0) + 1;
  }

  const summaryParts = Object.entries(counts)
    .map(([type, count]) => `${WORK_ITEM_ICON[type] || '📋'} ${count} ${type}${count > 1 ? 's' : ''}`)
    .join('  •  ');

  const body = [
    ...headerBlock(ICON.ticket, 'Work Item Drafts', `${workItems.length} work items ready for review`),
    {
      type: 'TextBlock',
      text: summaryParts,
      wrap: true,
      spacing: 'Small',
    },
    {
      type: 'TextBlock',
      text: 'Toggle work items on/off to include or exclude them. Click **Edit** to modify.',
      wrap: true,
      spacing: 'Small',
      isSubtle: true,
    },
    divider(),
  ];

  const grouped = {};
  const indexMap = {};
  for (let i = 0; i < workItems.length; i++) {
    const type = workItems[i].workItemType || 'Task';
    if (!grouped[type]) { grouped[type] = []; indexMap[type] = []; }
    grouped[type].push(workItems[i]);
    indexMap[type].push(i);
  }

  const priorityLabel = { 1: '🔴 Critical', 2: '🔴 High', 3: '🟡 Medium', 4: '🔵 Low' };

  for (const [type, items] of Object.entries(grouped)) {
    body.push({
      type: 'TextBlock',
      text: `${WORK_ITEM_ICON[type] || '📋'} **${type}s**`,
      weight: 'Bolder',
      spacing: 'Medium',
    });

    for (let j = 0; j < items.length; j++) {
      const wi = items[j];
      const idx = indexMap[type][j];
      const pLabel = priorityLabel[wi.priority] || '🟡 Medium';

      const descPreview = (wi.description || '').replace(/<[^>]*>/g, '');
      const descTruncated = descPreview.length > 150
        ? descPreview.substring(0, 150) + '...'
        : descPreview;

      const ticketItems = [];
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
                text: `**${wi.title || 'Untitled'}**`,
                wrap: true,
              },
              ...(descTruncated ? [{
                type: 'TextBlock',
                text: descTruncated,
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
              text: pLabel,
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
    text: `Target: **${config.adoProject || 'Azure DevOps'}**`,
    isSubtle: true,
    spacing: 'Medium',
    size: 'Small',
  });

  const actions = [
    {
      type: 'Action.Submit',
      title: `${ICON.task} Edit Work Items`,
      data: { action: 'showEditMenu', workItemsId },
    },
    {
      type: 'Action.Submit',
      title: `${ICON.link} Push Selected to Azure DevOps`,
      data: { action: 'submitSelectedToAdo', workItemsId },
      style: 'positive',
    },
  ];

  return card(body, actions);
}

// ─── Edit Work Item Menu Card ───

function buildEditWorkItemMenuCard(workItems, workItemsId) {
  const body = [
    ...headerBlock(ICON.task, 'Edit Work Items', 'Select a work item to edit'),
    divider(),
  ];

  const actions = [];
  for (let i = 0; i < workItems.length; i++) {
    const wi = workItems[i];
    const type = wi.workItemType || 'Task';
    const icon = WORK_ITEM_ICON[type] || '📋';
    actions.push({
      type: 'Action.Submit',
      title: `${icon} ${wi.title || 'Untitled'}`,
      data: { action: 'editWorkItem', workItemsId, workItemIndex: i },
    });
  }

  actions.push({
    type: 'Action.Submit',
    title: `${ICON.retry} Back to Drafts`,
    data: { action: 'cancelWorkItemEdit', workItemsId },
  });

  return card(body, actions);
}

// ─── Edit Single Work Item Card ───

function buildEditWorkItemCard(workItem, workItemIndex, workItemsId) {
  const title = workItem.title || '';
  const priority = workItem.priority || 3;
  const type = workItem.workItemType || 'Task';
  const description = (workItem.description || '').replace(/<[^>]*>/g, '');
  const tags = workItem.tags || '';

  const body = [
    ...headerBlock(ICON.task, `Edit: ${type}`, title),
    divider(),
    {
      type: 'Input.Text',
      id: 'editTitle',
      label: 'Title',
      value: title,
      placeholder: 'Work item title',
    },
    {
      type: 'Input.Text',
      id: 'editDescription',
      label: 'Description',
      value: description,
      placeholder: 'Work item description',
      isMultiline: true,
    },
    {
      type: 'Input.ChoiceSet',
      id: 'editPriority',
      label: 'Priority',
      value: String(priority),
      choices: [
        { title: '🔴 1 - Critical', value: '1' },
        { title: '🔴 2 - High', value: '2' },
        { title: '🟡 3 - Medium', value: '3' },
        { title: '🔵 4 - Low', value: '4' },
      ],
    },
    {
      type: 'Input.ChoiceSet',
      id: 'editType',
      label: 'Work Item Type',
      value: type,
      choices: [
        { title: '🏔️ Epic', value: 'Epic' },
        { title: '⭐ Feature', value: 'Feature' },
        { title: '📖 User Story', value: 'User Story' },
        { title: '✏️ Task', value: 'Task' },
        { title: '🐛 Bug', value: 'Bug' },
      ],
    },
    {
      type: 'Input.Text',
      id: 'editTags',
      label: 'Tags (semicolon-separated)',
      value: tags,
      placeholder: 'e.g., frontend; checkout; sprint-1',
    },
  ];

  return card(body, [
    {
      type: 'Action.Submit',
      title: `${ICON.check} Save Changes`,
      data: { action: 'saveWorkItemEdit', workItemsId, workItemIndex },
      style: 'positive',
    },
    {
      type: 'Action.Submit',
      title: 'Cancel',
      data: { action: 'cancelWorkItemEdit', workItemsId },
    },
  ]);
}

// ─── ADO Result Card ───

function buildAdoResultCard(results) {
  const { created, failed, total } = results;
  const allGood = failed === 0;

  const body = [
    ...headerBlock(
      allGood ? ICON.check : ICON.error,
      allGood ? 'All Work Items Created!' : 'Azure DevOps Submission Complete',
      `${created} of ${total} work items created successfully`
    ),
    divider(),
  ];

  const successes = results.results.filter(r => r.success);
  if (successes.length) {
    body.push({
      type: 'TextBlock',
      text: `${ICON.check} **Created**`,
      weight: 'Bolder',
      spacing: 'Medium',
    });
    for (const r of successes) {
      const id = r.workItemId || 'Unknown';
      const url = r.workItemUrl || '#';
      const typeIcon = WORK_ITEM_ICON[r.workItemType] || '📋';
      body.push({
        type: 'TextBlock',
        text: `${typeIcon} [#${id}](${url}) — ${r.title}`,
        wrap: true,
        spacing: 'Small',
      });
    }
  }

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
        text: `${r.title} — *${r.error || 'Unknown error'}*`,
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

module.exports = {
  buildProgressCard,
  buildErrorCard,
  buildPRDCard,
  buildSummaryCard,
  buildWorkItemDraftsCard,
  buildEditWorkItemMenuCard,
  buildEditWorkItemCard,
  buildAdoResultCard,
  buildWelcomeCard,
  buildHelpCard,
  buildValidationCard,
};
