# Code Coverage Guide

This project uses Vitest with V8 coverage provider for code coverage reporting.

## Installation

First, install the coverage provider:

```bash
npm install --save-dev @vitest/coverage-v8
```

## Available Coverage Commands

-   `npm run test:coverage` - Run all tests with coverage report
-   `npm run test:coverage:unit` - Run only unit tests with coverage
-   `npm run test:coverage:integration` - Run only integration tests with coverage
-   `npm run test:coverage:watch` - Run tests with coverage in watch mode
-   `npm run test:coverage:ui` - Run tests with coverage and open UI dashboard
-   `npm run coverage:open` - Open the HTML coverage report in browser

## Coverage Reports

Coverage reports are generated in multiple formats:

-   **Terminal**: Text output shown in console
-   **HTML**: Interactive report at `coverage/index.html`
-   **JSON**: Machine-readable report at `coverage/coverage.json`
-   **LCOV**: Standard format at `coverage/lcov.info` (for CI/CD integration)

## Coverage Thresholds

The project has coverage thresholds configured:

### Global Thresholds (80%)

-   Branches: 80%
-   Functions: 80%
-   Lines: 80%
-   Statements: 80%

### Service Layer (85%+)

-   Higher thresholds for business logic in `src/services/`

### Route Layer (80%+)

-   Standard thresholds for API routes in `src/routes/`

## Excluded Files

The following files are excluded from coverage:

-   Test files (`**/*.test.ts`, `**/*.spec.ts`)
-   Entry point (`src/index.ts`)
-   Database connection (`src/database/index.ts`)
-   Node modules and build artifacts

## Viewing Coverage

### HTML Report

Run tests with coverage and open the HTML report:

```bash
npm run test:coverage
npm run coverage:open
```

### Terminal Output

```bash
npm run test:coverage
```

### Watch Mode

For development, use watch mode:

```bash
npm run test:coverage:watch
```

## CI/CD Integration

The LCOV format (`coverage/lcov.info`) can be used with:

-   GitHub Actions with codecov/codeclimate
-   SonarQube
-   Other coverage tracking services

## Troubleshooting

If coverage seems incorrect:

1. Ensure all source files are included in the `include` pattern
2. Check that test files properly import and exercise the code
3. Verify that dynamic imports and conditional code are tested
4. Check the `exclude` patterns aren't too broad

## Coverage Goals

Aim for:

-   **90%+ coverage** for critical business logic (services)
-   **85%+ coverage** for API routes
-   **80%+ coverage** overall project
-   **100% coverage** for utility functions and helpers
