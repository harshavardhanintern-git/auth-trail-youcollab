# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (a lightweight npm workspace wrapper):

```bash
npm run install:all      # install Backend + Frontend deps
npm run dev              # backend :5000 + frontend :8080 concurrently
npm run dev:backend      # backend only (node --watch)
npm run dev:frontend     # frontend only (vite)
npm run db:migrate       # apply Backend/supabase/migrations to Supabase Postgres
npm run db:seed          # seed demo accounts + data
```

Frontend (run inside `Frontend/`):
```bash
npm run build            # vite production build → Frontend/dist
npm run lint             # eslint
npm run test             # vitest run (all)
npx vitest run src/test/example.test.ts   # single test file
npx vitest -t "name"     # single test by name
```

Backend has **no test/lint scripts** — only `dev` and `start`. Verify backend changes by booting it and hitting endpoints (e.g. `curl localhost:5000/api/health`, or `POST /api/auth/login` with a seed account).

Node **22+** is required (Supabase JS v2 needs native WebSocket).

## Architecture

Monorepo: a decoupled **React SPA** (`Frontend/`) and an **Express REST API** (`Backend/`) backed by **Supabase** (Postgres + Auth + Storage). In production the Express server also serves the built frontend from `Frontend/dist`, so the whole app ships as one container (`Dockerfile` → Railway). The frontend can alternatively be hosted standalone (`Frontend/vercel.json`) against a separate backend.

### Backend request path
Every domain follows `route → controller → service → Supabase`:
- `src/api/*.routes.js` — thin routers, mounted under `/api` in `src/api/index.js`.
- `src/controllers/*` — parse request, call service, wrap response. All wrapped in `asyncHandler` so thrown errors reach the global handler.
- `src/services/*` — **all business logic and Supabase queries live here.** This is where to make changes.
- `src/models/*.schema.js` — **Zod** schemas, applied via the `validate` middleware in routes.
- Errors: throw `AppError(message, statusCode, code)`; `middleware/errorHandler.js` formats every response as `{ success, data }` or `{ success, error: { message, code } }`. Match this envelope for new endpoints.

Supabase access is centralized in `Backend/supabase/client.js` (re-exported via `src/services/supabase.js`): `supabase` (anon key) and `supabaseAdmin` (service-role, used for auth-admin operations). Realtime is intentionally disabled on the backend.

### Authentication (hybrid — important)
Authentication is fully powered by **Clerk** (Supabase is database only):
- `@clerk/express`'s `clerkMiddleware()` is mounted globally in `src/index.js`; `middleware/auth.js` exposes `authenticate` (verifies the Clerk session via `getAuth(req)` and resolves/auto-creates the app `users` row) and `requireRole('BRAND'|'INFLUENCER')`.
- `services/user.service.js` bridges Clerk identities to the `users` table (`clerk_user_id` key): auto-provisioning on first login, legacy row claiming by email, and role persistence (DB + mirrored to Clerk `publicMetadata`).
- The only auth endpoints are `GET /api/auth/me` and `POST /api/auth/sync` (role selection after signup/OAuth). Signup, login, email verification codes, Google OAuth, password reset, sessions, and logout are all handled by Clerk on the frontend (`useSignUp`/`useSignIn`/`useAuth`/`useClerk` behind the existing custom UI).
- `CLERK_SECRET_KEY` is required; `config/index.js` throws on startup if it's unset when `NODE_ENV=production`.

### Frontend
- Feature-sliced under `src/features/` (auth, dashboard, gigs, applications, marketplace). Routing in `src/routes/App.tsx` with `ProtectedRoute` / `RoleRoute` guards.
- `src/lib/api.ts` — axios client with a request interceptor (attaches bearer token from `localStorage`) and a response interceptor that auto-refreshes on 401 (single-flight, queues concurrent requests) and redirects to `/login` on failure. Use `unwrap()` to strip the `{ data }` envelope.
- State: **TanStack React Query** for server state, **Zustand** (`src/stores/authStore.ts`, persisted to `localStorage` key `yc.auth`) for session. Access token also stored under `yc.accessToken`.
- UI: shadcn/Radix components in `src/components/ui` and `src/components/common`; Tailwind; forms via react-hook-form + Zod. `@` aliases `Frontend/src`.
- **Dev server runs on port 8080** (not Vite's default 5173) — see CORS allow-list in `Backend/src/index.js`.

### Database
Postgres via Supabase. `npm run db:migrate` (`Backend/supabase/migrate.js`) connects with the raw `pg` client using `DATABASE_URL` (the only place `pg` is used — the app runtime uses the Supabase JS client) and applies **exactly one file**: `migrations/migration.sql` — the single canonical schema. It is idempotent: it initializes a fresh Supabase project AND repairs drifted databases (renames pre-Clerk camelCase `users` columns, adds missing credits/Instagram columns, drops legacy credential tables). It also contains all indexes, triggers, RPC functions (`increment_view_count`, `debit_brand_credits`, `credit_influencer_earnings`, `get_user_stats`), RLS policies, realtime publications, and storage buckets (`avatars`, `gig-media`). **If you add schema changes, add them to `migration.sql` idempotently** (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) — do not create new migration files; the runner only executes this one. `DATABASE_URL` is read from `Backend/.env` first, then the repo-root `.env`. Tables: `users` (snake_case columns, keyed by `clerk_user_id`), `brands` (+`credits`, 500 trial), `influencers` (+`credits`, +`ig*` Instagram columns), `gigs`, `applications`, `notifications`, `messages` (DMs API under `/api/applications/:id/messages`), `reviews` (schema-ready; **no API/UI yet** — planned). All domain tables use quoted camelCase columns; only `users` is snake_case — do not "fix" this, every backend query depends on it.

## Environment

Backend env can live in `Backend/.env` **or** the repo-root `.env` (templates: `Backend/.env.example`, root `.env.example`) — `Backend/.env` wins when both exist; `config/index.js`, `migrate.js`, and `seed.js` all follow this chain. Backend needs Supabase keys (database only), `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`, `DATABASE_URL` (for db scripts), `CLIENT_URL` (CORS, comma-separated; dev frontend runs on :8080), and optional Instagram Graph API keys. Frontend reads `Frontend/.env`: `VITE_CLERK_PUBLISHABLE_KEY` (required) and `VITE_API_BASE_URL` (optional — defaults to http://localhost:5000 in dev, relative in prod).

## Integrations
- **Instagram Graph API** (`services/instagram.service.js`) via OAuth for creator metrics.
</content>
