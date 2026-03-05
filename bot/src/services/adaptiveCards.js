const config = require('../config');

/**
 * Build a progress indicator card.
 */
function buildProgressCard(message) {
  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: message,
          wrap: true,
          style: 'default',
        },
      ],
    },
  };
}

/**
 * Build an error card.
 */
function buildErrorCard(errorMessage) {
  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: 'An error occurred',
          weight: 'Bolder',
          size: 'Medium',
          color: 'Attention',
        },
        {
          type: 'TextBlock',
          text: errorMessage,
          wrap: true,
        },
      ],
    },
  };
}

/**
 * Build a PRD Adaptive Card with "Generate Jira Tickets" action.
 * prdId is a storage reference key (to avoid exceeding card data limits).
 */
function buildPRDCard(prdPreview, meetingSubject, prdId) {
  // Truncate PRD preview to keep card data small
  const preview = prdPreview.length > 2000
    ? prdPreview.substring(0, 2000) + '\n\n... (truncated for display)'
    : prdPreview;

  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: `PRD: ${meetingSubject}`,
          weight: 'Bolder',
          size: 'Large',
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: preview,
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: 'Click below to generate Jira tickets from this PRD.',
          wrap: true,
          spacing: 'Medium',
          isSubtle: true,
        },
        {
          type: 'Input.Text',
          id: 'projectKey',
          label: 'Jira Project Key',
          value: config.jiraProjectKey,
          placeholder: 'e.g., KAN',
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Generate Jira Tickets',
          data: {
            action: 'generateTickets',
            prdId: prdId,
          },
          style: 'positive',
        },
      ],
    },
  };
}

/**
 * Build a tickets summary card with "Submit to Jira" action.
 * ticketsId is a storage reference key.
 */
function buildTicketsCard(tickets, projectKey, ticketsId) {
  const epics = tickets.filter(t => t.fields?.issuetype?.name === 'Epic').length;
  const stories = tickets.filter(t => t.fields?.issuetype?.name === 'Story').length;
  const tasks = tickets.filter(t => t.fields?.issuetype?.name === 'Task').length;
  const bugs = tickets.filter(t => t.fields?.issuetype?.name === 'Bug').length;

  const summaryText = [
    epics > 0 ? `${epics} Epic(s)` : null,
    stories > 0 ? `${stories} Story/Stories` : null,
    tasks > 0 ? `${tasks} Task(s)` : null,
    bugs > 0 ? `${bugs} Bug(s)` : null,
  ].filter(Boolean).join(', ');

  const ticketItems = tickets.map(t => ({
    type: 'ColumnSet',
    columns: [
      {
        type: 'Column',
        width: 'auto',
        items: [{
          type: 'TextBlock',
          text: t.fields?.issuetype?.name || 'Task',
          weight: 'Bolder',
          color: t.fields?.issuetype?.name === 'Epic' ? 'Accent' : 'Default',
        }],
      },
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
          text: t.fields?.priority?.name || 'Medium',
          isSubtle: true,
        }],
      },
    ],
  }));

  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: 'Jira Tickets Generated',
          weight: 'Bolder',
          size: 'Large',
        },
        {
          type: 'TextBlock',
          text: `${tickets.length} tickets: ${summaryText}`,
          wrap: true,
          spacing: 'Small',
        },
        ...ticketItems,
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Submit All to Jira',
          data: {
            action: 'submitToJira',
            ticketsId: ticketsId,
            projectKey: projectKey,
          },
          style: 'positive',
        },
      ],
    },
  };
}

/**
 * Build a results card after Jira submission.
 */
function buildJiraResultCard(results) {
  const { created, failed, total } = results;

  const successItems = results.results
    .filter(r => r.success)
    .map(r => {
      const key = r.data?.key || 'Unknown';
      const url = config.jiraBaseUrl ? `${config.jiraBaseUrl}/browse/${key}` : '#';
      return {
        type: 'TextBlock',
        text: `[${key}](${url}) - ${r.summary}`,
        wrap: true,
      };
    });

  const failedItems = results.results
    .filter(r => !r.success)
    .map(r => ({
      type: 'TextBlock',
      text: `Failed: ${r.summary} - ${r.error || 'Unknown error'}`,
      wrap: true,
      color: 'Attention',
    }));

  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: 'Jira Submission Results',
          weight: 'Bolder',
          size: 'Large',
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Created', value: `${created}` },
            { title: 'Failed', value: `${failed}` },
            { title: 'Total', value: `${total}` },
          ],
        },
        ...successItems,
        ...failedItems,
      ],
    },
  };
}

module.exports = {
  buildProgressCard,
  buildErrorCard,
  buildPRDCard,
  buildTicketsCard,
  buildJiraResultCard,
};