import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Test environment
        environment: 'node',

        // Global test setup
        globals: true,

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: './coverage',

            // Include only source files
            include: ['src/**/*.{js,ts}'],

            // Exclude test files and other non-source files
            exclude: [
                'node_modules/',
                'dist/',
                'coverage/',
                'tests/',
                '**/*.test.{js,ts}',
                '**/*.spec.{js,ts}',
                'src/index.ts', // Main entry point, usually just server startup
                'src/database/index.ts', // Database connection file
                'src/sockets/utils/socketDatabase.ts', // Simple database wrappers
                'src/types/**/*.ts', // TypeScript type definitions
                'src/sockets/types/**/*.ts', // Socket type definitions
            ],

            // Coverage thresholds (optional - will fail tests if not met)
            thresholds: {
                global: {
                    branches: 90,
                    functions: 100,
                    lines: 95,
                    statements: 95,
                },
                // Per-file thresholds
                'src/services/*.ts': {
                    branches: 98,
                    functions: 100,
                    lines: 97,
                    statements: 97,
                },
                'src/routes/*.ts': {
                    branches: 75,
                    functions: 100,
                    lines: 85,
                    statements: 85,
                },
                'src/sockets/handlers/*.ts': {
                    branches: 100,
                    functions: 100,
                    lines: 100,
                    statements: 100,
                },
                'src/sockets/services/*.ts': {
                    branches: 100,
                    functions: 100,
                    lines: 100,
                    statements: 100,
                },
            },

            // Fail on low coverage
            skipFull: false,

            // Clean coverage directory before each run
            clean: true,
        },

        // Test file patterns
        include: ['tests/**/*.{test,spec}.{js,ts}'],

        // Setup files (if you have any)
        // setupFiles: ['./tests/setup.ts'],

        // Test timeout
        testTimeout: 10000,

        // Pool options for better performance
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: true,
            },
        },
    },
});
