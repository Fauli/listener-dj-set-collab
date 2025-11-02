/**
 * E2E test for multi-track playlist management
 * Tests the bug: Track list order changes after room reload
 */

import { test, expect } from '@playwright/test';
import { prisma } from '../../src/server/db/client.js';
import path from 'path';

test.describe('Multi-Track Playlist Management', () => {
  let testUser: { id: string; name: string };
  let testRoom: { id: string; name: string };

  test.beforeAll(async () => {
    // Create test user and room
    testUser = await prisma.user.create({
      data: {
        name: `E2E Multi-Track Test DJ ${Date.now()}`,
        role: 'dj1',
      },
    });

    testRoom = await prisma.room.create({
      data: {
        name: `E2E Multi-Track Test Room ${Date.now()}`,
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

  test('should maintain track order after uploading multiple files and reloading', async ({ page }) => {
    // Navigate to room
    await page.goto(`/rooms/${testRoom.id}`);
    await expect(page.getByText(testRoom.name)).toBeVisible();

    const testFilesPath = path.join(process.cwd(), 'tests', 'fixtures');

    // Upload first track
    await page.getByRole('button', { name: 'Add Track to Playlist' }).click();
    await page.getByRole('button', { name: 'Upload File' }).click();

    const fileInput1 = page.locator('input[type="file"]');
    await fileInput1.setInputFiles(path.join(testFilesPath, 'track1.mp3'));

    // Wait for first upload to complete (green checkmark)
    await expect(page.locator('svg.text-green-500').first()).toBeVisible({ timeout: 30000 });

    // Close the form by clicking the X button
    await page.getByText('Add New Track').locator('..').getByRole('button').click();

    // Wait for first track to appear in playlist
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-track-item]').first()).toBeVisible();

    // Upload second track
    await page.getByRole('button', { name: 'Add Track to Playlist' }).click();
    await page.getByRole('button', { name: 'Upload File' }).click();

    const fileInput2 = page.locator('input[type="file"]');
    await fileInput2.setInputFiles(path.join(testFilesPath, 'track2.mp3'));

    // Wait for second upload to complete (fresh green checkmark in new form)
    await expect(page.locator('svg.text-green-500').first()).toBeVisible({ timeout: 30000 });

    // Close the form by clicking the X button
    await page.getByText('Add New Track').locator('..').getByRole('button').click();

    // Wait for second track to appear in playlist
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-track-item]').nth(1)).toBeVisible();

    // Upload third track
    await page.getByRole('button', { name: 'Add Track to Playlist' }).click();
    await page.getByRole('button', { name: 'Upload File' }).click();

    const fileInput3 = page.locator('input[type="file"]');
    await fileInput3.setInputFiles(path.join(testFilesPath, 'track3.mp3'));

    // Wait for third upload to complete (fresh green checkmark in new form)
    await expect(page.locator('svg.text-green-500').first()).toBeVisible({ timeout: 30000 });

    // Close the form by clicking the X button
    await page.getByText('Add New Track').locator('..').getByRole('button').click();

    // Wait for third track to appear in playlist
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-track-item]').nth(2)).toBeVisible();

    // Get the track order before reload
    const tracksBefore = await page.locator('[data-track-item]').allTextContents();
    console.log('Tracks before reload:', tracksBefore);

    // Reload the page
    await page.reload();
    await expect(page.getByText(testRoom.name)).toBeVisible();

    // Wait for tracks to load
    await page.waitForTimeout(2000);
    const tracksAfterReload = await page.locator('[data-track-item]').count();
    expect(tracksAfterReload).toBe(3);

    // Get the track order after reload
    const tracksAfter = await page.locator('[data-track-item]').allTextContents();
    console.log('Tracks after reload:', tracksAfter);

    // Verify order is preserved
    expect(tracksAfter).toEqual(tracksBefore);

    // Verify we have exactly 3 tracks in the same order
    const trackElements = await page.locator('[data-track-item]').all();
    expect(trackElements.length).toBe(3);
  });

  test('should sync track additions across multiple clients in real-time', async ({ browser }) => {
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both navigate to the same room
    await page1.goto(`/rooms/${testRoom.id}`);
    await page2.goto(`/rooms/${testRoom.id}`);

    await expect(page1.getByText(testRoom.name)).toBeVisible();
    await expect(page2.getByText(testRoom.name)).toBeVisible();

    // Add track from page1
    await page1.getByRole('button', { name: 'Add Track to Playlist' }).click();
    await page1.getByRole('button', { name: 'Manual Entry' }).click();
    await page1.getByLabel('Track Title').fill('Synced Track');
    await page1.getByLabel('Artist').fill('Synced Artist');
    await page1.getByRole('button', { name: 'Add Track', exact: true }).click();

    // Verify track appears in page1
    await expect(page1.getByText('Synced Track')).toBeVisible();

    // Verify track appears in page2 via WebSocket sync
    await expect(page2.getByText('Synced Track')).toBeVisible({ timeout: 5000 });
    await expect(page2.getByText('Synced Artist')).toBeVisible();

    // Cleanup
    await context1.close();
    await context2.close();
  });
});
