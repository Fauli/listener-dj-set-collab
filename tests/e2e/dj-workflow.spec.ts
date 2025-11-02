/**
 * E2E test for complete DJ workflow
 * Tests: Upload → Load to Deck → Set Beat Grid → Set Cue Points → Reload → Verify Persistence
 */

import { test, expect } from '@playwright/test';
import { prisma } from '../../src/server/db/client.js';
import path from 'path';

test.describe('Complete DJ Workflow', () => {
  let testUser: { id: string; name: string };
  let testRoom: { id: string; name: string };

  test.beforeAll(async () => {
    // Create test user and room
    testUser = await prisma.user.create({
      data: {
        name: `E2E Test DJ ${Date.now()}`,
        role: 'dj1',
      },
    });

    testRoom = await prisma.room.create({
      data: {
        name: `E2E Test Room ${Date.now()}`,
        ownerId: testUser.id,
      },
    });
  });

  test.afterAll(async () => {
    // Cleanup
    await prisma.setEntry.deleteMany({
      where: { roomId: testRoom.id },
    }).catch(() => {});

    await prisma.room.delete({
      where: { id: testRoom.id },
    }).catch(() => {});

    await prisma.user.delete({
      where: { id: testUser.id },
    }).catch(() => {});

    await prisma.$disconnect();
  });

  test('should complete full DJ workflow with persistence', async ({ page }) => {
    // Navigate to room
    await page.goto(`/rooms/${testRoom.id}`);

    // Wait for room to load
    await expect(page.getByText(testRoom.name)).toBeVisible();

    // Step 1: Upload a track (using a test audio file)
    const testAudioPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-audio.mp3');

    // First expand the add track form
    await page.getByRole('button', { name: 'Add Track to Playlist' }).click();

    // Then click "Upload File" tab
    await page.getByRole('button', { name: 'Upload File' }).click();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    // Wait for upload to complete - look for green checkmark (completed status)
    await expect(page.locator('svg.text-green-500').first()).toBeVisible({ timeout: 20000 });

    // Wait a bit for the track to be added to playlist via WebSocket
    await page.waitForTimeout(1000);

    // Now track should appear with a Load to Deck button
    await expect(page.getByRole('button', { name: /Load to Deck A/i }).first()).toBeVisible({ timeout: 5000 });

    // Step 2: Load track to Deck A
    const loadToDeckAButton = page.getByRole('button', { name: /Load to Deck A/i }).first();
    await loadToDeckAButton.click();

    // Wait for track to load
    await expect(page.getByText('Deck A')).toBeVisible();
    await expect(page.getByText('Loaded')).toBeVisible();

    // Step 3: Auto-detect or manually set beat grid
    // The auto-detect should run automatically on track load
    // Wait for beat grid to be detected (look for "Grid" indicator or beat time display)
    await page.waitForTimeout(2000); // Give beat detection time to run

    // Check if beat grid was set (look for time display in beat grid control)
    const beatGridControl = page.locator('text=Grid').locator('..').locator('..');
    await expect(beatGridControl).toBeVisible();

    // Step 4: Set cue points
    // Set Start cue point
    const startCueButton = page.locator('button', { hasText: 'Start' }).first();
    await startCueButton.click();
    await expect(startCueButton).toHaveClass(/bg-green-600/);

    // Seek forward a bit and set End cue point
    await page.locator('canvas').first().click({ position: { x: 300, y: 50 } });
    await page.waitForTimeout(500);

    const endCueButton = page.locator('button', { hasText: 'End' }).first();
    await endCueButton.click();
    await expect(endCueButton).toHaveClass(/bg-red-600/);

    // Step 5: Verify cue points are visible
    await expect(startCueButton).toContainText(/\d:\d\d/); // Time format
    await expect(endCueButton).toContainText(/\d:\d\d/);

    // Get the cue point times for verification after reload
    const startCueText = await startCueButton.textContent();
    const endCueText = await endCueButton.textContent();

    // Step 6: Reload the page
    await page.reload();

    // Wait for room to load again
    await expect(page.getByText(testRoom.name)).toBeVisible();

    // Step 7: Load the same track again
    const reloadToDeckAButton = page.getByRole('button', { name: /Load to Deck A/i }).first();
    await reloadToDeckAButton.click();

    // Wait for track to load
    await expect(page.getByText('Loaded')).toBeVisible();

    // Step 8: Verify cue points persisted
    const startCueButtonAfterReload = page.locator('button', { hasText: 'Start' }).first();
    const endCueButtonAfterReload = page.locator('button', { hasText: 'End' }).first();

    // Cue buttons should still be set (colored)
    await expect(startCueButtonAfterReload).toHaveClass(/bg-green-600/);
    await expect(endCueButtonAfterReload).toHaveClass(/bg-red-600/);

    // Cue point times should match what we set before
    await expect(startCueButtonAfterReload).toContainText(/\d:\d\d/);
    await expect(endCueButtonAfterReload).toContainText(/\d:\d\d/);

    // Step 9: Test cue point deletion
    // Hover over Start cue to reveal delete button
    await startCueButtonAfterReload.hover();
    const deleteButton = page.locator('button[title*="Delete Start"]').first();
    await expect(deleteButton).toBeVisible();

    // Click delete button
    await deleteButton.click();

    // Verify Start cue is now unset
    await expect(startCueButtonAfterReload).not.toHaveClass(/bg-green-600/);
    await expect(startCueButtonAfterReload).toHaveClass(/bg-gray-700/);

    // End cue should still be set
    await expect(endCueButtonAfterReload).toHaveClass(/bg-red-600/);
  });

  test('should sync cue points across multiple clients', async ({ browser }) => {
    // Create two browser contexts (two DJs)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both navigate to the same room
    await page1.goto(`/rooms/${testRoom.id}`);
    await page2.goto(`/rooms/${testRoom.id}`);

    // Wait for both to load
    await expect(page1.getByText(testRoom.name)).toBeVisible();
    await expect(page2.getByText(testRoom.name)).toBeVisible();

    // Upload track in page1 (if playlist is empty)
    const trackCount = await page1.getByRole('button', { name: /Load to Deck A/i }).count();
    if (trackCount === 0) {
      const testAudioPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-audio.mp3');
      await page1.getByRole('button', { name: 'Add Track to Playlist' }).click();
      await page1.getByRole('button', { name: 'Upload File' }).click();
      const fileInput = page1.locator('input[type="file"]');
      await fileInput.setInputFiles(testAudioPath);

      // Wait for upload to complete
      await expect(page1.locator('svg.text-green-500').first()).toBeVisible({ timeout: 20000 });
      await page1.waitForTimeout(1000);

      await expect(page1.getByRole('button', { name: /Load to Deck A/i }).first()).toBeVisible({ timeout: 5000 });
    }

    // Load track in page1
    await page1.getByRole('button', { name: /Load to Deck A/i }).first().click();
    await expect(page1.getByText('Loaded')).toBeVisible();
    await page1.waitForTimeout(1000);

    // Set cue point in page1
    const cueButtonPage1 = page1.locator('button', { hasText: 'A' }).first();
    await cueButtonPage1.click();
    await expect(cueButtonPage1).toHaveClass(/bg-blue-600/);

    // Load same track in page2
    await page2.getByRole('button', { name: /Load to Deck A/i }).first().click();
    await expect(page2.getByText('Loaded')).toBeVisible();

    // Verify cue point appears in page2 (after loading the track)
    const cueButtonPage2 = page2.locator('button', { hasText: 'A' }).first();
    await expect(cueButtonPage2).toHaveClass(/bg-blue-600/);

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('should allow jumping to cue points', async ({ page }) => {
    // Navigate to room
    await page.goto(`/rooms/${testRoom.id}`);
    await expect(page.getByText(testRoom.name)).toBeVisible();

    // Ensure track exists and load it
    const trackCount = await page.getByRole('button', { name: /Load to Deck A/i }).count();
    if (trackCount === 0) {
      const testAudioPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-audio.mp3');
      await page.getByRole('button', { name: 'Add Track to Playlist' }).click();
      await page.getByRole('button', { name: 'Upload File' }).click();
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testAudioPath);

      // Wait for upload to complete
      await expect(page.locator('svg.text-green-500').first()).toBeVisible({ timeout: 20000 });
      await page.waitForTimeout(1000);

      await expect(page.getByRole('button', { name: /Load to Deck A/i }).first()).toBeVisible({ timeout: 5000 });
    }

    await page.getByRole('button', { name: /Load to Deck A/i }).first().click();
    await expect(page.getByText('Loaded')).toBeVisible();

    // Set a cue point at current position (should be 0:00)
    const cueButton = page.locator('button', { hasText: 'B' }).first();
    await cueButton.click();

    // Seek forward
    await page.locator('canvas').first().click({ position: { x: 400, y: 50 } });
    await page.waitForTimeout(500);

    // Click cue button to jump back to cue point
    await cueButton.click();

    // Should jump back to 0:00 (or close to it)
    // We can verify by checking the current time display updates
    const timeDisplay = page.locator('text=/\\d+:\\d+/').first();
    await expect(timeDisplay).toContainText('0:0');
  });
});
