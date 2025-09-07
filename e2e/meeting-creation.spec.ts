import { test, expect } from '@playwright/test';

test.describe('Meeting Creation Flow', () => {
  test('should create a meeting successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Fill in the meeting form
    await page.fill('input[placeholder*="Q4 Strategy Review"]', 'Test Meeting for E2E');
    await page.fill('input[placeholder*="full name"]', 'Test Organizer');

    // Submit the form
    await page.click('button:has-text("Create Meeting")');

    // Wait for navigation to meeting page
    await page.waitForURL(/\/meeting\/.*/, { timeout: 10000 });

    // Verify we're on the meeting page
    expect(page.url()).toMatch(/\/meeting\/[a-f0-9-]+/);

    // Verify meeting title is displayed
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'Test Meeting for E2E' })).toBeVisible();

    // Verify organizer name is displayed
    await expect(page.locator('text=Test Organizer')).toBeVisible();

    // Verify share functionality is present
    await expect(page.locator('button:has-text("Copy Link"), button:has-text("Share")')).toBeVisible();

    // Verify availability form is present
    await expect(page.locator('input[placeholder*="name"], input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/');

    // Try to submit without filling fields
    await page.click('button:has-text("Create Meeting")');

    // Should show validation message
    await expect(page.locator('text=Missing Information').first()).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/meetings', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failed' })
      });
    });

    await page.goto('/');

    await page.fill('input[placeholder*="Q4 Strategy Review"]', 'Test Meeting');
    await page.fill('input[placeholder*="full name"]', 'Test User');
    await page.click('button:has-text("Create Meeting")');

    // Should show error message
    await expect(page.locator('text=Error').first()).toBeVisible();
  });
});