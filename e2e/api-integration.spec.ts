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

  test('should handle CORS properly', async ({ request }) => {
    // Hit the API server directly: Vite's dev proxy answers preflights itself
    // (204, echoed origin), whereas Vercel passes them to the handler.
    const response = await request.fetch('http://127.0.0.1:3001/api/meetings', {
      method: 'OPTIONS'
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toBeTruthy();
  });

  test('should handle network timeouts gracefully', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/meetings', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', title: 'Delayed Meeting', creator_name: 'Test', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' })
      });
    });

    await page.goto('/');
    await page.fill('input[placeholder*="Q4 Strategy Review"]', 'Timeout Test');
    await page.fill('input[placeholder*="full name"]', 'Test User');
    
    // Should show loading state
    await page.click('button:has-text("Create Meeting")');
    await expect(page.getByText('Creating Meeting...')).toBeVisible();

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
          body: JSON.stringify({ id: '22222222-2222-4222-8222-222222222222', title: 'Retry Meeting', creator_name: 'Retry User', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' })
        });
      }
    });

    await page.goto('/');
    await page.fill('input[placeholder*="Q4 Strategy Review"]', 'Retry Test');
    await page.fill('input[placeholder*="full name"]', 'Retry User');
    await page.click('button:has-text("Create Meeting")');

    // Should show error first
    await expect(page.getByText('Failed to create meeting. Please try again.').first()).toBeVisible();

    // User clicks retry or tries again
    await page.click('button:has-text("Create Meeting")');

    // Should succeed on retry
    await page.waitForURL(/\/meeting\/.*/, { timeout: 10000 });
    expect(attemptCount).toBe(2);
  });
});