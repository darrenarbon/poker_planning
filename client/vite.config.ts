import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        env: {
            VITE_API_URL: 'http://api.test',
            VITE_FRONTEND_URL: 'http://app.test',
            VITE_AUTH0_DOMAIN: 'auth.test',
            VITE_AUTH0_CLIENT_ID: 'test-client-id',
        },
    },
});
