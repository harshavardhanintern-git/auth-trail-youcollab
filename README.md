# YouCollab — Influencer Collaboration Marketplace

> Where Pune's brands meet creators 🚀

A localized influencer collaboration marketplace focused on Pune. Brands post gigs, creators apply, collaboration happens.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/Radix UI, TanStack React Query, Zustand |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (via Supabase) |
| Auth | Clerk (email + password, Google OAuth, email verification codes, password reset, sessions) |
| Uploads | Multer (local `uploads/`, cloud-ready) |
| Integrations | Instagram Graph API |

## Architecture

Monorepo with a decoupled React SPA and an Express REST API backed by Supabase.
In production the Express server also serves the built frontend, so the whole app
ships as a single container (see `Dockerfile` / `railway.toml`).

```
You-Collab-AIG/
├── Backend/              # Express + Supabase API
│   ├── src/
│   │   ├── api/          # Route definitions (per domain)
│   │   ├── controllers/  # HTTP handlers
│   │   ├── services/     # Business logic + Supabase queries
│   │   ├── models/       # Zod validation schemas
│   │   ├── middleware/   # Auth, role guard, rate limiting, upload, errors
│   │   ├── config/       # Environment config
│   │   └── utils/        # AppError, asyncHandler, logger, pagination
│   ├── supabase/         # Client, migrations, seed
│   └── uploads/          # Local file storage
├── Frontend/             # React + Vite SPA
│   └── src/
│       ├── features/     # Feature-sliced pages (auth, dashboard, gigs, ...)
│       ├── components/   # ui/, common/, layout/
│       ├── services/     # Typed API wrappers
│       ├── stores/       # Zustand (app user profile)
│       └── lib/          # Axios client (Clerk token bridge), utils
├── Dockerfile            # Multi-stage build (frontend + backend)
├── railway.toml          # Railway deploy config
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 22+ (Supabase JS v2 requires native WebSocket support)
- A Supabase project (URL + anon key + service-role key) — used as the **database only**
- A [Clerk](https://clerk.com) application with **Email + Password** (verification via
  6-digit email code), **Google** social connection, and password reset enabled

### 1. Install dependencies

```bash
npm run install:all      # installs both Backend and Frontend
```

### 2. Configure environment

```bash
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env
# Fill in the values (see "Environment Variables" below)
```

### 3. Set up the database

```bash
npm run db:migrate       # applies the single canonical migration.sql (idempotent)
npm run db:seed          # seeds demo accounts + data
```

### 4. Run development servers

```bash
npm run dev              # backend :5000  +  frontend :8080 (concurrently)
```

Or run them separately: `npm run dev:backend` / `npm run dev:frontend`.

### 5. Open the app

Visit [http://localhost:8080](http://localhost:8080). The API runs on
[http://localhost:5000](http://localhost:5000) (`GET /api/health` for a heartbeat).

## Environment Variables

### Backend (`Backend/.env`)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase (database only) |
| `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk API keys (**secret key required in production**) |
| `DATABASE_URL` | Postgres connection string |
| `CLIENT_URL` | Allowed CORS origin(s), comma-separated |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI` | Instagram Graph API |
| `MAX_FILE_SIZE`, `UPLOAD_DIR` | Upload limits/location |
| `PORT`, `NODE_ENV` | Server config |

### Frontend (`Frontend/.env`)
| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (empty in prod → relative calls) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (same Clerk instance as the backend) |

## Authentication Flow (Clerk)

Authentication is fully powered by [Clerk](https://clerk.com); Supabase is the
database only. The custom YouCollab auth UI is preserved — it drives Clerk's
headless APIs (`useSignUp`, `useSignIn`, `useAuth`, `useUser`).

1. **Register** → the signup form creates the Clerk account with the selected role
   (Creator/Brand) stored in Clerk metadata, then Clerk emails a 6-digit verification code.
2. **Verify email** → the code is verified with Clerk, the session is activated, and the
   role is synced to the database (`POST /api/auth/sync`), creating the `users` row.
3. **Login** → email + password (or **Continue with Google**) via Clerk; the app profile
   is fetched from `GET /api/auth/me` — the `users` record is auto-created on first login.
4. **Sessions** → Clerk manages session tokens and rotation; the axios client attaches a
   fresh Clerk token to every API call, and `@clerk/express` verifies it on the backend.
5. **Forgot password** → Clerk's `reset_password_email_code` flow behind the existing UI.
6. **Logout** → Clerk `signOut()`.

## Seed Accounts

Seeded users are database records only (auth lives in Clerk). Sign up through the
app with one of these emails and the backend automatically links the seeded profile:

| Email | Role |
|---|---|
| cafe@youcollab.in | Brand |
| urbanfit@youcollab.in | Brand |
| priya@youcollab.in | Influencer |
| arjun@youcollab.in | Influencer |
| sneha@youcollab.in | Influencer |

## Deployment

- **Single container (Railway):** the multi-stage `Dockerfile` builds the frontend and
  serves it from the Express backend. Configure via `railway.toml` + Railway variables.
- **Split hosting:** the frontend can also be deployed standalone (see `Frontend/vercel.json`)
  pointing `VITE_API_BASE_URL` at a separately hosted backend.

## License
MIT
</content>
</invoke>
