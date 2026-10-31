# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
- **Full application**: `npm run dev:full` (recommended) or `npm run dev:vercel`. Both run Vercel's local server on port 3000, serving the Vite app and `/api/*` functions together.
- **Frontend-only Vite server**: `npm run dev` (port 3000, proxies `/api/*` to :3001).
- **Local API server**: `npm run dev:api` (`scripts/dev-api-server.ts`, port 3001). Mounts the `api/` handlers without Vercel. Never reads `.env`; needs `SUPABASE_URL`/`SUPABASE_ANON_KEY` and refuses non-local databases unless `SCHEDULA_ALLOW_REMOTE_DB=1`.
- **Throwaway database**: `supabase start` (Docker) builds the `schedula` schema from `supabase/migrations/`; `supabase status -o env` gives the URL and anon key. `.env` points at production Supabase, so never run e2e with it.

### Build & Quality
- **Typecheck**: `npm run typecheck` (or `npm run typecheck:app` / `npm run typecheck:api`)
- **Build**: `npm run build` (runs typechecking before Vite's production build)
- **Build dev**: `npm run build:dev` (development mode build)
- **Lint**: `npm run lint`
- **Preview**: `npm run preview` (preview production build)

### Testing
- **Unit tests**: `npm run test:unit`
- **E2E tests**: `npm run test` or `npx playwright test`. Starts `dev:api` + `dev` itself; export `SUPABASE_URL`/`SUPABASE_ANON_KEY` from a local `supabase start` first. CI (`.github/workflows/e2e-tests.yml`) does the same against a throwaway stack.
- **Test UI**: `npm run test:ui` or `npx playwright test --ui`
- **Test headed**: `npm run test:headed` (visible browser)
- **Test debug**: `npm run test:debug` (debug mode)

## Architecture Overview

Schedula is a meeting scheduling application with a React frontend and Vercel serverless backend.

### Critical Local Development Setup

`/api/*` routes are Vercel serverless functions. Use `npm run dev:full` for any end-to-end work; it validates `.env` and starts the project-local Vercel CLI at `http://localhost:3000`.

### Technology Stack

**Frontend**: React 18 + TypeScript + Vite + shadcn/ui components + React Router

**Backend**: Vercel serverless functions (`/api/` directory) backed by Supabase PostgreSQL

**API Architecture**:
- `POST /api/meetings` - create a meeting
- `GET` and `PUT /api/meetings/:id` - read or update a meeting
- `GET /api/availability?meeting_id=:id` and `POST /api/availability` - list or add availability

### Database Architecture

**Current setup**: the API functions access the `schedula` Supabase schema. It contains `meetings` and `availability`, with availability rows belonging to a meeting. The browser uses `src/integrations/api/` to call those functions.

**Environment Variables**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### Key Component Architecture

**Meeting Creation Flow**:
1. `CreateMeeting.tsx` → `src/integrations/api/queries.ts` → `/api/meetings/` → Supabase
2. Success redirects to `/meeting/[id]` via React Router

**Availability Management**:
1. `AddAvailability.tsx` collects time slots
2. `AvailabilityDisplay.tsx` shows consolidated view with overlap detection
3. The meeting view refreshes data through the API client after changes

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

Playwright starts the API server (:3001) and Vite (:3000) itself. Unit tests (vitest) live in `src/**/*.test.ts` and `tests/` (API handlers with a mocked Supabase client, request validation, response parsers, availability logic).

## Important Development Notes

- **No authentication required** - meetings are public via UUID
- **Local storage** remembers participant names across sessions  
- **Mobile-first responsive design** using Tailwind breakpoints
- **UUID-based meeting IDs** for security and uniqueness
- **Availability visualization** with overlap detection
- **Vercel Functions** serve the API routes
