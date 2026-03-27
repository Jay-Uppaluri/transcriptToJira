const config = {
  MicrosoftAppId: process.env.CLIENT_ID,
  MicrosoftAppType: process.env.BOT_TYPE,
  MicrosoftAppTenantId: process.env.TENANT_ID,
  MicrosoftAppPassword: process.env.CLIENT_SECRET,
  openAIKey: process.env.OPENAI_API_KEY,
  openAIModelName: "gpt-4o",

  // Graph API
  graphClientSecret: process.env.GRAPH_CLIENT_SECRET || process.env.CLIENT_SECRET,

  // Azure DevOps
  adoOrgUrl: process.env.ADO_ORG_URL,
  adoProject: process.env.ADO_PROJECT,
  adoPat: process.env.ADO_PAT,
};

module.exports = config;
