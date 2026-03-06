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
      text: `1. Paste your transcript → I generate a **PRD**\n2. Review the PRD → Click **Generate Jira Tickets**\n3. Review tickets → Click **Submit to Jira**\n\nYou can also just chat with me for general questions.`,
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
    text: `${ICON.ticket} Ready to generate Jira tickets from this PRD.`,
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

// ─── Tickets Card ───

function buildTicketsCard(tickets, projectKey, ticketsId) {
  const counts = {};
  for (const t of tickets) {
    const type = t.fields?.issuetype?.name || 'Task';
    counts[type] = (counts[type] || 0) + 1;
  }

  const summaryParts = Object.entries(counts)
    .map(([type, count]) => `${ISSUE_ICON[type] || '📋'} ${count} ${type}${count > 1 ? 's' : ''}`)
    .join('  •  ');

  const body = [
    ...headerBlock(ICON.ticket, 'Jira Tickets Generated', `${tickets.length} tickets ready for review`),
    {
      type: 'TextBlock',
      text: summaryParts,
      wrap: true,
      spacing: 'Small',
    },
    divider(),
  ];

  // Group by type
  const grouped = {};
  for (const t of tickets) {
    const type = t.fields?.issuetype?.name || 'Task';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(t);
  }

  for (const [type, items] of Object.entries(grouped)) {
    body.push({
      type: 'TextBlock',
      text: `${ISSUE_ICON[type] || '📋'} **${type}s**`,
      weight: 'Bolder',
      spacing: 'Medium',
    });

    for (const t of items) {
      const priority = t.fields?.priority?.name || 'Medium';
      const priorityIcon = priority === 'High' || priority === 'Highest' ? '🔴'
        : priority === 'Low' || priority === 'Lowest' ? '🔵' : '🟡';

      body.push({
        type: 'ColumnSet',
        spacing: 'Small',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [{
              type: 'TextBlock',
              text: t.fields?.summary || 'Untitled',
              wrap: true,
            }],
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

  return card(body, [
    {
      type: 'Action.Submit',
      title: `${ICON.jira} Submit All to Jira`,
      data: { action: 'submitToJira', ticketsId, projectKey },
      style: 'positive',
    },
  ]);
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

module.exports = {
  buildProgressCard,
  buildErrorCard,
  buildPRDCard,
  buildTicketsCard,
  buildJiraResultCard,
  buildWelcomeCard,
  buildHelpCard,
  buildValidationCard,
};
