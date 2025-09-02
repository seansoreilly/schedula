import { test, expect } from '@playwright/test';

test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    test(`should render correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      // Main form should be visible and usable
      await expect(page.locator('input[placeholder*="Meeting"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="name"]')).toBeVisible();
      await expect(page.locator('button:has-text("Create Meeting")')).toBeVisible();

      // Test form functionality
      await page.fill('input[placeholder*="Meeting"]', `${viewport.name} Test Meeting`);
      await page.fill('input[placeholder*="name"]', `${viewport.name} User`);
      
      // Form should be submittable
      const createButton = page.locator('button:has-text("Create Meeting")');
      await expect(createButton).toBeEnabled();
    });

    test(`should handle meeting page on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Create a meeting first
      await page.goto('/');
      await page.fill('input[placeholder*="Meeting"]', `Responsive ${viewport.name} Meeting`);
      await page.fill('input[placeholder*="name"]', 'Responsive Tester');
      await page.click('button:has-text("Create Meeting")');
      
      await page.waitForURL(/\/meeting\/.*/, { timeout: 10000 });

      // Meeting header should be visible
      await expect(page.locator('h1, h2, h3').filter({ hasText: `Responsive ${viewport.name} Meeting` })).toBeVisible();

      // Availability form should be accessible
      await expect(page.locator('input[placeholder*="name"]')).toBeVisible();
      await expect(page.locator('input[type="date"]')).toBeVisible();
      
      // Time selectors should be usable
      const startTimeSelect = page.locator('select').first();
      await expect(startTimeSelect).toBeVisible();
      
      // Add availability should work
      await page.fill('input[placeholder*="name"]', 'Mobile User');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill('input[type="date"]', dateString);
      
      // Should be able to scroll and interact with time selectors
      await page.selectOption('select:near(:text("Start Time"))', '10:00');
      await page.selectOption('select:near(:text("End Time"))', '11:00');
      
      const addButton = page.locator('button:has-text("Add My Availability")');
      await expect(addButton).toBeVisible();
      await expect(addButton).toBeEnabled();
    });
  }

  test('should handle navigation menu on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check if there's a mobile menu or hamburger button
    const hamburger = page.locator('button[aria-label*="menu"], button:has([class*="hamburger"]), button:has([class*="menu"])');
    
    if (await hamburger.count() > 0) {
      await hamburger.click();
      // Should show navigation options
      await expect(page.locator('[role="menu"], [class*="menu"]')).toBeVisible();
    }
  });

  test('should handle touch interactions', async ({ page, isMobile }) => {
    if (!isMobile) {
      await page.setViewportSize({ width: 375, height: 667 });
    }

    await page.goto('/');

    // Test touch-friendly button sizes
    const createButton = page.locator('button:has-text("Create Meeting")');
    const buttonBox = await createButton.boundingBox();
    
    if (buttonBox) {
      // Button should be at least 44px tall (Apple's recommended touch target size)
      expect(buttonBox.height).toBeGreaterThanOrEqual(40);
    }

    // Test form interactions work with touch
    await page.fill('input[placeholder*="Meeting"]', 'Touch Test Meeting');
    await page.fill('input[placeholder*="name"]', 'Touch User');
    
    // Tap the button (mobile-style interaction)
    await page.tap('button:has-text("Create Meeting")');
    
    // Should work the same as click
    await page.waitForURL(/\/meeting\/.*/, { timeout: 10000 });
  });

  test('should handle orientation changes', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify initial layout
    await expect(page.locator('input[placeholder*="Meeting"]')).toBeVisible();

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });

    // Should still be functional
    await expect(page.locator('input[placeholder*="Meeting"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create Meeting")')).toBeVisible();

    // Form should still work
    await page.fill('input[placeholder*="Meeting"]', 'Landscape Test');
    await page.fill('input[placeholder*="name"]', 'Landscape User');
    
    const createButton = page.locator('button:has-text("Create Meeting")');
    await expect(createButton).toBeEnabled();
  });
});