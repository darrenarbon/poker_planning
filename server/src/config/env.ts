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
    auth0Audience: process.env.LOCAL_URL,
    auth0IssuerBaseUrl: 'https://dev-1jevct6pshmx18pw.uk.auth0.com/',
    atlassianDomain: process.env.ATLASSIAN_DOMAIN,
    atlassianEmail: process.env.ATLASSIAN_EMAIL,
    atlassianApiKey: process.env.ATLASSIAN_API_KEY,
    storyPointsField: 'customfield_10024',
};
