# GitHub Actions Configuration

## Database Read Check

This workflow (`database-read.yml`) performs a scheduled read operation on your Neon database every 5 days.

### Required Secrets

To use this workflow, you need to configure the following secret in your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following repository secret:

**`DATABASE_URL`** - Your Neon database connection string
- Format: `postgresql://username:password@host:port/database?sslmode=require`
- Example: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech:5432/neondb?sslmode=require`

### Workflow Details

- **Schedule**: Runs every 5 days at 2:00 AM UTC
- **Manual Trigger**: Can be triggered manually via GitHub Actions UI
- **Purpose**: Keeps the database connection active and verifies connectivity
- **Operations**: 
  - Checks database connectivity
  - Retrieves current timestamp and database version
  - Counts public schema tables

### Manual Trigger

You can manually trigger this workflow:
1. Go to Actions tab in your GitHub repository
2. Select "Database Read Check" workflow
3. Click "Run workflow" button