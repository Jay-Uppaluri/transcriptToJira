const config = {
  MicrosoftAppId: process.env.CLIENT_ID,
  MicrosoftAppType: process.env.BOT_TYPE,
  MicrosoftAppTenantId: process.env.TENANT_ID,
  MicrosoftAppPassword: process.env.CLIENT_SECRET,
  openAIKey: process.env.OPENAI_API_KEY,
  openAIModelName: "gpt-4o",

  // Graph API
  graphClientSecret: process.env.GRAPH_CLIENT_SECRET || process.env.CLIENT_SECRET,

  // Jira
  jiraBaseUrl: process.env.JIRA_BASE_URL,
  jiraUserEmail: process.env.JIRA_USER_EMAIL,
  jiraApiToken: process.env.JIRA_API_TOKEN,
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || 'KAN',
};

module.exports = config;
