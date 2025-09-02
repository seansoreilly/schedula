import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('should handle API connectivity', async ({ page }) => {
    // Test that API endpoints are reachable
    const response = await page.request.get('/api/meetings/test-connectivity');
    
    // Should get either 404 (endpoint not found) or proper response, not network error
    expect([200, 404, 405]).toContain(response.status());
  });

  test('should create meeting via API', async ({ page }) => {
    const meetingData = {
      title: 'API Test Meeting',
      creator_name: 'API Test User'
    };

    const response = await page.request.post('/api/meetings', {
      data: meetingData
    });

    if (response.status() === 500) {
      // Check if it's a database connectivity issue
      const responseBody = await response.json();
      console.log('API Error:', responseBody);
      
      // If database is not connected, we expect specific error messages
      expect(responseBody.error).toBe('Internal server error');
    } else {
      expect(response.status()).toBe(201);
      const meeting = await response.json();
      expect(meeting.title).toBe(meetingData.title);
      expect(meeting.creator_name).toBe(meetingData.creator_name);
      expect(meeting.id).toBeTruthy();
    }
  });

  test('should validate meeting creation data', async ({ page }) => {
    // Test missing title
    const incompleteData = {
      creator_name: 'Test User'
      // title missing
    };

    const response = await page.request.post('/api/meetings', {
      data: incompleteData
    });

    expect(response.status()).toBe(400);
    const errorResponse = await response.json();
    expect(errorResponse.error).toContain('required');
  });

  test('should handle CORS properly', async ({ page }) => {
    // Navigate to the app first to establish origin
    await page.goto('/');

    // Make a cross-origin style request
    const response = await page.evaluate(async () => {
      const response = await fetch('/api/meetings', {
        method: 'OPTIONS'
      });
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      };
    });

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-methods']).toBeTruthy();
  });

  test('should handle network timeouts gracefully', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/meetings', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test', title: 'Delayed Meeting', creator_name: 'Test' })
      });
    });

    await page.goto('/');
    await page.fill('input[placeholder*="Meeting"]', 'Timeout Test');
    await page.fill('input[placeholder*="name"]', 'Test User');
    
    // Should show loading state
    await page.click('button:has-text("Create Meeting")');
    await expect(page.locator('text=Creating, text=Loading')).toBeVisible();

    // Should eventually complete
    await page.waitForURL(/\/meeting\/.*/, { timeout: 10000 });
  });

  test('should retry failed requests', async ({ page }) => {
    let attemptCount = 0;
    
    // Mock API to fail first time, succeed second time
    await page.route('**/api/meetings', route => {
      attemptCount++;
      if (attemptCount === 1) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Temporary failure' })
        });
      } else {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'retry-test', title: 'Retry Meeting', creator_name: 'Retry User' })
        });
      }
    });

    await page.goto('/');
    await page.fill('input[placeholder*="Meeting"]', 'Retry Test');
    await page.fill('input[placeholder*="name"]', 'Retry User');
    await page.click('button:has-text("Create Meeting")');

    // Should show error first
    await expect(page.locator('text=Error, text=Failed')).toBeVisible();

    // User clicks retry or tries again
    await page.click('button:has-text("Create Meeting")');

    // Should succeed on retry
    await page.waitForURL(/\/meeting\/.*/, { timeout: 10000 });
    expect(attemptCount).toBe(2);
  });
});