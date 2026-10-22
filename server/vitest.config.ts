import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        // config/env.ts throws at import time without these
        env: {
            SUPABASE_URL: 'http://supabase.test',
            SUPABASE_KEY: 'test-key',
            LOCAL_URL: 'http://audience.test',
            ATLASSIAN_DOMAIN: 'example',
            ATLASSIAN_EMAIL: 'jira@example.com',
            ATLASSIAN_API_KEY: 'jira-key',
        },
        restoreMocks: true,
    },
});
