# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development (Critical Setup)
- **Full dev setup**: `npm run dev:full` or `./start-dev.sh` (recommended - runs Vercel dev server with environment validation)
- **Alternative setup**: Run both `npm run dev` (frontend) AND `vercel dev --listen 3001` (API) in separate terminals
- **Frontend only**: `npm run dev` (Vite dev server on port 3000)
- **API server**: `vercel dev --listen 3001` (serverless functions on port 3001)

### Build & Quality
- **Build**: `npm run build` or `bun run build` 
- **Build dev**: `npm run build:dev` (development mode build)
- **Lint**: `npm run lint`
- **Preview**: `npm run preview` (preview production build)

### Testing
- **E2E tests**: `npm run test` or `npx playwright test`
- **Test UI**: `npm run test:ui` or `npx playwright test --ui`
- **Test headed**: `npm run test:headed` (visible browser)
- **Test debug**: `npm run test:debug` (debug mode)

## Architecture Overview

Schedula is a meeting scheduling application with a React frontend and Vercel serverless backend.

### Critical Local Development Setup

**The `/api/*` routes are Vercel serverless functions that require special handling in local development:**

1. **Option 1 (Recommended)**: Use `npm run dev:full` which runs the setup script that validates environment and starts Vercel dev server
2. **Option 2**: Manually run both servers:
   - `npm run dev` (frontend on port 3000) 
   - `vercel dev --listen 3001` (API on port 3001)
   - Vite proxy configuration forwards `/api/*` requests from 3000 → 3001

### Technology Stack

**Frontend**: React 18 + TypeScript + Vite build system + shadcn/ui components + TanStack Query for server state + React Router for routing

**Backend**: Vercel serverless functions (`/api/` directory) with Supabase PostgreSQL database and Redis caching

**API Architecture**:
- `/api/meetings/` - POST to create meetings, GET to list
- `/api/meetings/[id]` - GET/PUT/DELETE specific meeting  
- `/api/availability/` - POST to create availability, GET with meeting_id query

### Database Architecture

**Current Setup**: Transitioning from Neon to Supabase as primary database
- Database client in `src/integrations/supabase/` 
- API layer in `src/integrations/api/` abstracts database calls
- Schema: `meetings` table with `availability` table (foreign key relationship)
- Supabase schema: `schedula` (configured in API endpoints)

**Environment Variables**:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key  
- `REDIS_URL` - Redis connection string (optional)

### Key Component Architecture

**Meeting Creation Flow**:
1. `CreateMeeting.tsx` → `src/integrations/api/queries.ts` → `/api/meetings/` → Supabase
2. Success redirects to `/meeting/[id]` via React Router

**Availability Management**:
1. `AddAvailability.tsx` collects time slots
2. `AvailabilityDisplay.tsx` shows consolidated view with overlap detection
3. Data flows through TanStack Query for caching and optimistic updates

**Core Components**:
- `CreateMeeting.tsx` - Hero landing page with meeting creation form
- `MeetingView.tsx` - Meeting details and participant management
- `AddAvailability.tsx` - Time slot selection interface
- `AvailabilityDisplay.tsx` - Visual availability overlap display
- `ShareMeeting.tsx` - Meeting link sharing functionality

### Testing Architecture

Playwright E2E tests in `/e2e/` directory covering:
- Meeting creation flow (`meeting-creation.spec.ts`)
- Availability management (`availability-management.spec.ts`)
- Sharing functionality (`meeting-sharing.spec.ts`)
- Responsive design (`responsive-design.spec.ts`)
- API integration (`api-integration.spec.ts`)

Tests automatically start development server on localhost:3000.

## Important Development Notes

- **No authentication required** - meetings are public via UUID
- **Local storage** remembers participant names across sessions  
- **Mobile-first responsive design** using Tailwind breakpoints
- **UUID-based meeting IDs** for security and uniqueness
- **Real-time availability visualization** with overlap detection
- **Vercel deployment optimized** with edge functions and caching