import { test, expect } from '@playwright/test';

test.describe('Availability Management', () => {
  let meetingUrl: string;

  test.beforeEach(async ({ page }) => {
    // Create a meeting first
    await page.goto('/');
    await page.fill('input[placeholder*="Q4 Strategy Review"]', 'E2E Test Meeting');
    await page.fill('input[placeholder*="full name"]', 'Test Organizer');
    await page.click('button:has-text("Create Meeting")');
    
    // Wait for navigation and capture URL
    await page.waitForURL(/\/meeting\/.*/, { timeout: 10000 });
    meetingUrl = page.url();
  });

  test('should add availability successfully', async ({ page }) => {
    // Should already be on meeting page from beforeEach
    await expect(page.locator('h1, h2, h3').filter({ hasText: 'E2E Test Meeting' })).toBeVisible();

    // Fill availability form
    await page.fill('input[placeholder*="name"]', 'John Doe');
    
    // Set date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateString);

    // Set time
    await page.selectOption('select:near(:text("Start Time"))', '09:00');
    await page.selectOption('select:near(:text("End Time"))', '10:00');

    // Submit availability
    await page.click('button:has-text("Add My Availability")');

    // Should show success message
    await expect(page.locator('text=Success, text=Added')).toBeVisible();

    // Should display the added availability
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=09:00')).toBeVisible();
  });

  test('should validate availability form fields', async ({ page }) => {
    // Try to submit without filling all fields
    await page.click('button:has-text("Add My Availability")');

    // Should show validation error
    await expect(page.locator('text=Missing Information, text=required')).toBeVisible();
  });

  test('should validate time range', async ({ page }) => {
    // Fill form with invalid time range (end before start)
    await page.fill('input[placeholder*="name"]', 'Jane Doe');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateString);

    await page.selectOption('select:near(:text("Start Time"))', '10:00');
    await page.selectOption('select:near(:text("End Time"))', '09:00');

    await page.click('button:has-text("Add My Availability")');

    // Should show time validation error
    await expect(page.locator('text=Invalid Time Range, text=after')).toBeVisible();
  });

  test('should persist user name in localStorage', async ({ page }) => {
    // Add availability with a name
    await page.fill('input[placeholder*="name"]', 'Persistent User');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateString);

    await page.selectOption('select:near(:text("Start Time"))', '14:00');
    await page.selectOption('select:near(:text("End Time"))', '15:00');
    await page.click('button:has-text("Add My Availability")');

    // Refresh the page
    await page.reload();

    // Name should be pre-filled
    const nameInput = page.locator('input[placeholder*="name"]');
    await expect(nameInput).toHaveValue('Persistent User');
  });

  test('should handle multiple availability entries', async ({ page }) => {
    // Add first availability
    await page.fill('input[placeholder*="name"]', 'Multi User');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateString);

    await page.selectOption('select:near(:text("Start Time"))', '09:00');
    await page.selectOption('select:near(:text("End Time"))', '10:00');
    await page.click('button:has-text("Add My Availability")');

    // Wait for success message
    await expect(page.locator('text=Success, text=Added')).toBeVisible();

    // Add second availability (different time)
    await page.selectOption('select:near(:text("Start Time"))', '14:00');
    await page.selectOption('select:near(:text("End Time"))', '15:00');
    await page.click('button:has-text("Add My Availability")');

    // Should show both availabilities
    await expect(page.locator('text=09:00')).toBeVisible();
    await expect(page.locator('text=14:00')).toBeVisible();
  });
});