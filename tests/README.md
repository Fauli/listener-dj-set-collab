# Testing Guide

This directory contains all tests for the Listener application.

## Test Structure

```
tests/
├── unit/              # Unit tests (isolated, no external dependencies)
├── integration/       # Integration tests (require running server)
├── e2e/              # End-to-end tests (Playwright browser tests)
├── fixtures/         # Test audio files for E2E tests
└── setup.ts          # Global test setup
```

## Running Tests

### Unit Tests Only
```bash
npm test -- tests/unit
```

### Integration Tests
**⚠️ IMPORTANT**: Integration tests require the dev server to be running.

```bash
# Terminal 1: Start the dev server
npm run dev:server

# Terminal 2: Run integration tests
npm test -- tests/integration
```

### E2E Tests
E2E tests automatically start the dev servers via Playwright configuration.

```bash
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Run with Playwright UI
npm run test:e2e:headed    # Run in headed mode (visible browser)
```

### All Tests
```bash
# Start dev server first, then:
npm run test:all
```

## Test Fixtures

E2E tests require audio files in `tests/fixtures/`. If they're missing, run:

```bash
./create-test-fixtures.sh
```

This creates:
- `test-audio.mp3` - 5-second sine wave (440 Hz)
- `track1.mp3`, `track2.mp3`, `track3.mp3` - Additional test tracks

## Writing Tests

### Unit Tests
Place in `tests/unit/` - should have no external dependencies:
```typescript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### Integration Tests
Place in `tests/integration/` - make HTTP requests to API:
```typescript
/**
 * Integration test for feature X
 * NOTE: Requires server to be running (npm run dev:server)
 */
import { describe, it, expect } from 'vitest';

const API_BASE = 'http://localhost:3000/api';

describe('API Endpoint', () => {
  it('should respond correctly', async () => {
    const response = await fetch(`${API_BASE}/endpoint`);
    expect(response.ok).toBe(true);
  });
});
```

### E2E Tests
Place in `tests/e2e/` - test complete user workflows:
```typescript
import { test, expect } from '@playwright/test';

test('user can perform action', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
  await expect(page.locator('.result')).toBeVisible();
});
```

## Common Issues

### "ECONNREFUSED" in integration tests
→ **Solution**: Start the dev server with `npm run dev:server`

### "ENOENT: no such file or directory" for test-audio.mp3
→ **Solution**: Run `./create-test-fixtures.sh`

### Playwright tests hang
→ **Solution**: Playwright auto-starts servers. Check `playwright.config.ts` webServer config.

### Database conflicts between tests
→ Tests use `beforeEach`/`afterAll` hooks to clean up. Check test isolation if issues occur.

## CI/CD Considerations

For CI environments:
1. Run `./create-test-fixtures.sh` before tests
2. Set `CI=true` environment variable
3. Playwright will run with retries and single worker

Example GitHub Actions:
```yaml
- name: Create test fixtures
  run: ./create-test-fixtures.sh

- name: Run all tests
  run: npm run test:all
  env:
    CI: true
```
