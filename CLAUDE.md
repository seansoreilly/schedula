# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Dev server**: `npm run dev` or `bun run dev` (starts on localhost:3000)
- **Build**: `npm run build` or `bun run build` 
- **Lint**: `npm run lint`
- **Test**: `npx playwright test` (E2E tests with Playwright)
- **Test UI**: `npx playwright test --ui`
- **Preview**: `npm run preview` (preview production build)

## Architecture Overview

This is a meeting scheduling application built with React, TypeScript, and Vite, with a Vercel serverless backend.

### Key Architecture Decisions

**Frontend**: React SPA using Vite for build tooling, shadcn/ui components, TanStack Query for server state management, and React Router for routing.

**Backend**: Vercel serverless functions in `/api/` directory using PostgreSQL (Neon/Supabase) for persistence. API endpoints handle meeting creation and availability management.

**Database**: Uses both Neon (src/integrations/neon/) and Supabase configurations. Database schema includes `meetings` and `availability` tables with proper foreign key relationships.

**Styling**: Tailwind CSS with shadcn/ui component system. All UI components are in `src/components/ui/`.

### Core Components

- `CreateMeeting.tsx` - Meeting creation form
- `MeetingView.tsx` - Display meeting details and availability
- `AddAvailability.tsx` - Participant availability input
- `AvailabilityDisplay.tsx` - Consolidated availability visualization
- `ShareMeeting.tsx` - Meeting sharing functionality

### Data Flow

1. Meetings are created via `/api/meetings/` endpoint
2. Availability is stored via `/api/availability/` endpoint
3. Frontend uses TanStack Query for API state management
4. Database operations use PostgreSQL with both Neon and Supabase clients

### Environment Setup

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `VITE_SUPABASE_URL` - Supabase project URL  
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Testing

E2E tests using Playwright in `/e2e/` directory. Tests cover meeting creation, availability management, and responsive design. Test server automatically starts on localhost:3000.

## Important Notes

- Deployment target is Vercel with serverless functions
- Uses both Neon and Supabase database clients (dual setup)
- No authentication required - meetings are publicly accessible via UUID
- Local storage used for remembering participant names
- Responsive design with mobile-first approach using Tailwind breakpoints