/**
 * E2E Test Authentication Helper
 * Provides utilities for authenticating test users in E2E tests
 */

import { Page, BrowserContext } from '@playwright/test';

const API_URL = 'http://localhost:3000';

/**
 * Authenticate a browser context by logging in as a specific user
 * Uses the /auth/test-login endpoint (only available in test/dev environments)
 */
export async function authenticateContext(context: BrowserContext, userId: string): Promise<void> {
  const page = await context.newPage();

  try {
    // Call the test-login endpoint
    const response = await page.request.post(`${API_URL}/auth/test-login`, {
      data: { userId },
    });

    if (!response.ok()) {
      throw new Error(`Failed to authenticate: ${response.status()} ${await response.text()}`);
    }

    // Visit the home page to establish the session cookie
    await page.goto('http://localhost:5173/');

    // Verify authentication by checking /auth/me
    const meResponse = await page.request.get(`${API_URL}/auth/me`);

    if (!meResponse.ok()) {
      throw new Error('Authentication verification failed');
    }
  } finally {
    await page.close();
  }
}

/**
 * Authenticate a page by logging in as a specific user
 * Uses the /auth/test-login endpoint (only available in test/dev environments)
 */
export async function authenticatePage(page: Page, userId: string): Promise<void> {
  // Call the test-login endpoint
  const response = await page.request.post(`${API_URL}/auth/test-login`, {
    data: { userId },
  });

  if (!response.ok()) {
    throw new Error(`Failed to authenticate: ${response.status()} ${await response.text()}`);
  }

  // Visit the home page to establish the session cookie
  await page.goto('http://localhost:5173/');

  // Verify authentication by checking /auth/me
  const meResponse = await page.request.get(`${API_URL}/auth/me`);

  if (!meResponse.ok()) {
    throw new Error('Authentication verification failed');
  }
}
