import 'dotenv/config';

const required = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

export const env = {
    port: Number(process.env.PORT_NUMBER) || 10000,
    supabaseUrl: required('SUPABASE_URL'),
    supabaseKey: required('SUPABASE_KEY'),
    auth0Audience: required('LOCAL_URL'),
    auth0IssuerBaseUrl: required('AUTH0_ISSUER_BASE_URL'),
    atlassianDomain: process.env.ATLASSIAN_DOMAIN,
    atlassianEmail: process.env.ATLASSIAN_EMAIL,
    atlassianApiKey: process.env.ATLASSIAN_API_KEY,
    jiraStoryPointsField: process.env.JIRA_STORY_POINTS_FIELD,
};
