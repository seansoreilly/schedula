import { test, expect } from '@playwright/test';

test.describe('Meeting Sharing', () => {
  let meetingUrl: string;

  test.beforeEach(async ({ page }) => {
    // Create a meeting first
    await page.goto('/');
    await page.fill('input[placeholder*="Q4 Strategy Review"]', 'Shareable Meeting');
    await page.fill('input[placeholder*="full name"]', 'Share Test Organizer');
    await page.click('button:has-text("Create Meeting")');
    
    await page.waitForURL(/\/meeting\/.*/, { timeout: 10000 });
    meetingUrl = page.url();
  });

  test('should display shareable link', async ({ page }) => {
    // The meeting URL is shown in a read-only input
    await expect(page.locator('input[readonly]')).toHaveValue(meetingUrl);
  });

  test('should copy meeting link to clipboard', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Clipboard permissions can only be granted in Chromium');

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy button
    await page.getByTitle('Copy link').click();

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(meetingUrl);

    // Should show success feedback
    await expect(page.getByText('Link Copied Successfully').first()).toBeVisible();
  });

  test('should allow direct URL access to meeting', async ({ browser }) => {
    // Open a new browser context (simulating different user)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

    // Navigate directly to the meeting URL
    await newPage.goto(meetingUrl);

    // Should display the meeting
    await expect(newPage.locator('h1, h2, h3').filter({ hasText: 'Shareable Meeting' })).toBeVisible();
    await expect(newPage.locator('text=Share Test Organizer')).toBeVisible();

    // Should be able to add availability as a different user
    await newPage.fill('input[placeholder*="name"]', 'Shared User');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await newPage.fill('input[type="date"]', dateString);

    await newPage.selectOption('select:near(:text("Start Time"))', '11:00');
    await newPage.selectOption('select:near(:text("End Time"))', '12:00');
    await newPage.click('button:has-text("Add My Availability")');

    await expect(newPage.getByText('Availability Added Successfully').first()).toBeVisible();

    await newContext.close();
  });

  test('should handle invalid meeting URLs', async ({ page }) => {
    // Navigate to non-existent meeting
    await page.goto('/meeting/invalid-meeting-id');

    // Should show "not found" message
    await expect(page.getByText('Meeting Not Found')).toBeVisible();
  });

  test('should edit meeting title', async ({ page }) => {
    // Find and click edit button for title
    await page.getByRole('heading', { name: 'Shareable Meeting' }).hover();
    await page.getByRole('button', { name: 'Edit meeting title' }).click();

    // Edit the title
    const titleInput = page.locator('input:focus');
    await expect(titleInput).toHaveValue('Shareable Meeting');
    await titleInput.clear();
    await titleInput.fill('Updated Meeting Title');

    // Save the changes
    await page.getByRole('button', { name: 'Save meeting title' }).click();

    // Verify title updated
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'Updated Meeting Title' })).toBeVisible();

    // Verify success message
    await expect(page.getByText('Meeting Title Updated').first()).toBeVisible();
  });

  test('should cancel title editing', async ({ page }) => {
    // Start editing
    await page.getByRole('heading', { name: 'Shareable Meeting' }).hover();
    await page.getByRole('button', { name: 'Edit meeting title' }).click();

    // Change title but cancel
    const titleInput = page.locator('input:focus');
    await expect(titleInput).toHaveValue('Shareable Meeting');
    await titleInput.clear();
    await titleInput.fill('Cancelled Edit');

    // Cancel the edit (ESC key or cancel button)
    await page.keyboard.press('Escape');

    // Title should remain unchanged
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'Shareable Meeting' })).toBeVisible();
  });
});
