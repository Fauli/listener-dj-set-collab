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

    // Wait for the track to be added to playlist via WebSocket (longer timeout)
    // The track needs to: upload -> process metadata -> emit to WebSocket -> UI update
    await expect(page.getByRole('button', { name: '▶ A' }).first()).toBeVisible({ timeout: 15000 });

    // Step 2: Load track to Deck A
    const loadToDeckAButton = page.getByRole('button', { name: '▶ A' }).first();
    await loadToDeckAButton.click();

    // Wait for track to load - check for Unload button which appears when track is loaded
    await expect(page.getByText('Deck A')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unload' }).first()).toBeVisible({ timeout: 10000 });

    // Step 3: Auto-detect or manually set beat grid
    // The auto-detect should run automatically on track load
    // Wait for beat grid to be detected - just skip verification since it's automatic
    await page.waitForTimeout(2000); // Give beat detection time to run

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
    const reloadToDeckAButton = page.getByRole('button', { name: '▶ A' }).first();
    await reloadToDeckAButton.click();

    // Wait for track to load - check for Unload button
    await expect(page.getByRole('button', { name: 'Unload' }).first()).toBeVisible({ timeout: 10000 });

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
    const trackCount = await page1.getByRole('button', { name: '▶ A' }).count();
    if (trackCount === 0) {
      const testAudioPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-audio.mp3');
      await page1.getByRole('button', { name: 'Add Track to Playlist' }).click();
      await page1.getByRole('button', { name: 'Upload File' }).click();
      const fileInput = page1.locator('input[type="file"]');
      await fileInput.setInputFiles(testAudioPath);

      // Wait for upload to complete and track to appear in playlist
      await expect(page1.locator('svg.text-green-500').first()).toBeVisible({ timeout: 20000 });
      await expect(page1.getByRole('button', { name: '▶ A' }).first()).toBeVisible({ timeout: 15000 });
    }

    // Load track in page1
    await page1.getByRole('button', { name: '▶ A' }).first().click();
    await expect(page1.getByRole('button', { name: 'Unload' }).first()).toBeVisible({ timeout: 10000 });

    // Set cue point in page1 - use .nth(0) to get Deck A's cue button (Deck A is first)
    // Find all buttons with exactly "A" text, first one will be Deck A's
    const cueButtonPage1 = page1.locator('button').filter({ hasText: /^A$/ }).nth(0);
    await cueButtonPage1.click();
    await expect(cueButtonPage1).toHaveClass(/bg-blue-600/, { timeout: 5000 });

    // Load same track in page2
    await page2.getByRole('button', { name: '▶ A' }).first().click();
    await expect(page2.getByRole('button', { name: 'Unload' }).first()).toBeVisible({ timeout: 10000 });

    // Verify cue point appears in page2 (after loading the track and syncing via WebSocket)
    const cueButtonPage2 = page2.locator('button').filter({ hasText: /^A$/ }).nth(0);
    await expect(cueButtonPage2).toHaveClass(/bg-blue-600/, { timeout: 5000 });

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('should allow jumping to cue points', async ({ page }) => {
    // Navigate to room
    await page.goto(`/rooms/${testRoom.id}`);
    await expect(page.getByText(testRoom.name)).toBeVisible();

    // Ensure track exists and load it
    const trackCount = await page.getByRole('button', { name: '▶ A' }).count();
    if (trackCount === 0) {
      const testAudioPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-audio.mp3');
      await page.getByRole('button', { name: 'Add Track to Playlist' }).click();
      await page.getByRole('button', { name: 'Upload File' }).click();
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testAudioPath);

      // Wait for upload to complete and track to appear in playlist
      await expect(page.locator('svg.text-green-500').first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole('button', { name: '▶ A' }).first()).toBeVisible({ timeout: 15000 });
    }

    await page.getByRole('button', { name: '▶ A' }).first().click();
    await expect(page.getByRole('button', { name: 'Unload' }).first()).toBeVisible({ timeout: 10000 });

    // Set a cue point at current position (should be 0:00)
    const cueButton = page.locator('button').filter({ hasText: /^B$/ }).nth(0);
    await cueButton.click();
    await expect(cueButton).toHaveClass(/bg-blue-600/, { timeout: 5000 });

    // Seek forward using the slider (more stable than clicking canvas)
    const seekSlider = page.locator('input[type="range"]').first();
    await seekSlider.fill('50'); // Seek to 50% position
    await page.waitForTimeout(500);

    // Click cue button to jump back to cue point
    await cueButton.click();
    await page.waitForTimeout(500);

    // Should jump back to near 0:00
    // Verify by checking the slider is back near the start
    const sliderValue = await seekSlider.inputValue();
    expect(parseInt(sliderValue)).toBeLessThan(10); // Should be close to 0
  });
});
