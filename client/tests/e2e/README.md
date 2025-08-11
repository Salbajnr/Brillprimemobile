
# End-to-End Testing

This directory contains end-to-end tests for the BrillPrime web application using Playwright.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npm run test:e2e:install
```

## Running Tests

- Run all tests: `npm run test:e2e`
- Run tests in headed mode: `npm run test:e2e:headed`
- Debug tests: `npm run test:e2e:debug`
- View test report: `npm run test:e2e:report`

## Test Structure

- `auth.spec.ts` - Authentication flow tests
- `navigation.spec.ts` - Navigation and routing tests
- `user-flows.spec.ts` - Complete user journey tests
- `responsive.spec.ts` - Responsive design tests
- `accessibility.spec.ts` - Accessibility compliance tests
- `performance.spec.ts` - Performance benchmarking tests
- `forms.spec.ts` - Form interaction tests

## Test Helpers

- `helpers/auth-helper.ts` - Authentication utilities
- `helpers/test-data.ts` - Test data and fixtures

## Configuration

Tests are configured in `playwright.config.ts` and run across multiple browsers:
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## CI/CD Integration

These tests can be integrated into your CI/CD pipeline for automated testing on code changes.
