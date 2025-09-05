# Playwright E2E Test Suite

## Test Coverage

### 1. Meeting Creation Flow (`e2e/meeting-creation.spec.ts`)
- ✅ Create meeting successfully with valid data
- ✅ Validate required form fields
- ✅ Handle API errors gracefully
- ✅ Navigate to meeting page after creation

### 2. Availability Management (`e2e/availability-management.spec.ts`)
- ✅ Add availability with valid time slots
- ✅ Validate all required fields
- ✅ Validate time range (end after start)
- ✅ Persist user name in localStorage
- ✅ Handle multiple availability entries

### 3. Meeting Sharing (`e2e/meeting-sharing.spec.ts`)
- ✅ Display shareable meeting link
- ✅ Copy link to clipboard functionality
- ✅ Direct URL access to meetings
- ✅ Handle invalid/non-existent meeting URLs
- ✅ Edit meeting title functionality
- ✅ Cancel title editing

### 4. API Integration (`e2e/api-integration.spec.ts`)
- ✅ Test API endpoint connectivity
- ✅ Create meetings via API calls
- ✅ Validate API request data
- ✅ Handle CORS properly
- ✅ Network timeout handling
- ✅ Request retry logic

### 5. Responsive Design (`e2e/responsive-design.spec.ts`)
- ✅ Mobile viewport (375px width)
- ✅ Tablet viewport (768px width)
- ✅ Desktop viewport (1440px width)
- ✅ Touch-friendly button sizes
- ✅ Orientation changes
- ✅ Mobile navigation

## Running Tests

### Prerequisites
```bash
# Install browser dependencies (Linux/WSL)
sudo npx playwright install-deps

# Install browsers
npx playwright install
```

### Test Commands
```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Debug specific test
npm run test:debug

# Run specific test file
npm run test e2e/meeting-creation.spec.ts

# Run tests for specific viewport
npm run test -- --project=chromium
```

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test
```

## Test Environment Setup

### Local Development
1. Start development server: `npm run dev`
2. Tests will automatically start the dev server
3. Tests run against `http://localhost:5173`

### Production Testing
Update `playwright.config.ts` to test against production:
```typescript
use: {
  baseURL: 'https://your-production-url.vercel.app',
}
```

## Key Features Tested

### MCP (Model Context Protocol) Functionality
- ✅ **Database Operations**: Meeting creation, retrieval, updates
- ✅ **API Layer**: RESTful endpoints with proper error handling
- ✅ **Real-time Updates**: Form submissions and data persistence
- ✅ **Cross-browser Compatibility**: Chrome, Firefox, Safari
- ✅ **Mobile Responsiveness**: Touch interactions, viewport adaptation
- ✅ **Error Handling**: Network failures, validation errors, timeouts

### User Workflows
1. **Meeting Organizer Journey**
   - Create meeting → Share link → View participants

2. **Participant Journey**
   - Receive link → Add availability → View overlaps

3. **Collaborative Scheduling**
   - Multiple participants → Time slot matching → Optimal meeting time

## Debugging Failed Tests

### Common Issues
1. **Browser not installed**: Run `npx playwright install`
2. **Dev server not running**: Tests auto-start server, check port conflicts
3. **API endpoints failing**: Check database connection and environment variables
4. **Timeout errors**: Increase timeouts in `playwright.config.ts`

### Debug Commands
```bash
# Run single test with debug mode
npx playwright test meeting-creation.spec.ts --debug

# Generate test report
npx playwright show-report

# Record new test
npx playwright codegen localhost:5173
```

## Test Data Management

Tests use ephemeral data:
- Each test creates fresh meetings
- No shared state between tests
- Automatic cleanup after test completion
- Mock API responses for error scenarios

## Performance Testing

Responsive design tests verify:
- Button touch targets (44px minimum)
- Viewport adaptation
- Loading states and feedback
- Network timeout handling