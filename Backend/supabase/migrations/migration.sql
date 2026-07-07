-- ═══════════════════════════════════════════════════════════════════════════
-- YouCollab — Canonical Database Schema (single source of truth)
-- ═══════════════════════════════════════════════════════════════════════════
-- This is the ONLY migration file for the project.
--
--   • Initializes a brand-new Supabase project completely.
--   • Idempotent: safe to run repeatedly.
--   • Also repairs databases that drifted (pre-Clerk camelCase users table,
--     missing credits / Instagram columns, leftover credential tables).
--
-- How to apply (either works):
--   1. `npm run db:migrate`   (uses DATABASE_URL from Backend/.env or ./.env)
--   2. Paste this entire file into Supabase Dashboard → SQL Editor → Run
--
-- Architecture notes:
--   • Authentication is powered by CLERK. Supabase is DATABASE ONLY.
--   • `users` is keyed to Clerk via `clerk_user_id` and uses snake_case
--     columns (Clerk-era schema). Records are auto-created by the backend
--     on first successful login.
--   • Domain tables (brands, influencers, gigs, applications, notifications,
--     messages, reviews) use quoted camelCase columns — this matches every
--     query in Backend/src/services and MUST NOT be renamed casually.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── users ── Clerk identity → application profile ───────────────────────────
-- role is NULLable: it is selected during signup / first OAuth login and
-- synced by POST /api/auth/sync.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('BRAND', 'INFLUENCER')),
  avatar_url TEXT,
  is_onboarded BOOLEAN NOT NULL DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── brands ───────────────────────────────────────────────────────────────────
-- credits: one-time 500-credit trial pack, debited atomically on hires.
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "businessName" TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Pune',
  bio TEXT NOT NULL,
  "logoUrl" TEXT,
  website TEXT,
  credits INTEGER NOT NULL DEFAULT 500
);

-- ── influencers ─────────────────────────────────────────────────────────────
-- credits: earned balance (starts at 0, credited when a brand hires).
-- ig* columns: Instagram Graph API integration state and synced metrics.
CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "instagramHandle" TEXT NOT NULL,
  niche TEXT NOT NULL,
  bio TEXT NOT NULL,
  "profileImageUrl" TEXT,
  "followerCount" INTEGER DEFAULT 0,
  credits INTEGER NOT NULL DEFAULT 0,
  -- Instagram Graph API — identity
  "igUserId" TEXT,
  "igUsername" TEXT,
  -- Instagram Graph API — auth tokens
  "igAccessToken" TEXT,
  "igTokenExpiresAt" TIMESTAMPTZ,
  -- Instagram Graph API — connection meta
  "igConnectedAt" TIMESTAMPTZ,
  "isIgVerified" BOOLEAN NOT NULL DEFAULT false,
  -- Instagram Graph API — synced profile metrics
  "igFollowersCount" INTEGER,
  "igFollowingCount" INTEGER,
  "igMediaCount" INTEGER,
  "igProfilePicUrl" TEXT,
  "igBio" TEXT,
  -- Instagram Graph API — sync tracking
  "igLastSyncAt" TIMESTAMPTZ
);

-- ── gigs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "brandId" UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  "budgetMin" INTEGER NOT NULL,
  "budgetMax" INTEGER,
  deliverables TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  city TEXT NOT NULL DEFAULT 'Pune',
  category TEXT NOT NULL,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── applications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "gigId" UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  "influencerId" UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  "coverNote" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("gigId", "influencerId")
);

-- ── notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── messages ── brand ↔ influencer DMs within an approved collab ─────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "senderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "receiverId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "applicationId" UUID REFERENCES applications(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── reviews ── post-collaboration ratings (schema-ready; API planned) ────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  "reviewerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "revieweeId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. DRIFT REPAIR (no-ops on a fresh database)
-- ═══════════════════════════════════════════════════════════════════════════
-- Upgrades databases created from older schema versions:
--   a) pre-Clerk `users` with camelCase columns and password storage
--   b) missing credits / Instagram columns on brands & influencers
--   c) leftover refresh_tokens / email_otps tables

-- a) users: rename legacy camelCase columns → required snake_case names
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'avatarUrl') THEN
    ALTER TABLE users RENAME COLUMN "avatarUrl" TO avatar_url;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'isOnboarded') THEN
    ALTER TABLE users RENAME COLUMN "isOnboarded" TO is_onboarded;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'lastActiveAt') THEN
    ALTER TABLE users RENAME COLUMN "lastActiveAt" TO last_active_at;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'createdAt') THEN
    ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'updatedAt') THEN
    ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- users: ensure every required column exists (covers partially-migrated DBs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- users: unique constraint for Clerk id (name-checked for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_clerk_user_id_key') THEN
    ALTER TABLE users ADD CONSTRAINT users_clerk_user_id_key UNIQUE (clerk_user_id);
  END IF;
END $$;

-- users: drop pre-Clerk credential storage (Clerk owns credentials/sessions)
ALTER TABLE users DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE users DROP COLUMN IF EXISTS "authId";
DROP INDEX IF EXISTS idx_users_auth_id;

-- users: role selectable after signup → must be NULLable
ALTER TABLE users ALTER COLUMN role DROP NOT NULL;

-- b) brands / influencers: ensure credits + Instagram columns exist
ALTER TABLE brands ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 500;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS "igUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "igUsername" TEXT,
  ADD COLUMN IF NOT EXISTS "igAccessToken" TEXT,
  ADD COLUMN IF NOT EXISTS "igTokenExpiresAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "igConnectedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "isIgVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "igFollowersCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "igFollowingCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "igMediaCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "igProfilePicUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "igBio" TEXT,
  ADD COLUMN IF NOT EXISTS "igLastSyncAt" TIMESTAMPTZ;

-- c) drop legacy session/OTP tables (Clerk owns sessions & verification)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS email_otps;

-- NOTE — leftover Lovable bug-tracker tables:
-- Some environments were polluted by unrelated scaffold migrations that
-- created profiles / user_roles / projects / bugs / comments / attachments /
-- company_settings / invitations. They are NOT part of YouCollab. They are
-- intentionally NOT dropped automatically (never destroy unknown data from a
-- migration). If you have verified they are unused, clean up manually with:
--
--   DROP TABLE IF EXISTS public.comments, public.bugs, public.attachments,
--     public.projects, public.invitations, public.company_settings,
--     public.user_roles, public.profiles CASCADE;
--   DROP TYPE IF EXISTS public.app_role, public.bug_severity, public.bug_status;
--   DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);
--   DROP FUNCTION IF EXISTS public.get_team_members();


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- users
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- brands / influencers
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands("userId");
CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON influencers("userId");
CREATE UNIQUE INDEX IF NOT EXISTS influencers_ig_user_id_idx
  ON influencers ("igUserId")
  WHERE "igUserId" IS NOT NULL;

-- gigs (marketplace filters + cursor pagination sort keys)
CREATE INDEX IF NOT EXISTS idx_gigs_brand_id ON gigs("brandId");
CREATE INDEX IF NOT EXISTS idx_gigs_city ON gigs(city);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category);
CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON gigs("createdAt");
CREATE INDEX IF NOT EXISTS idx_gigs_deadline ON gigs(deadline);
CREATE INDEX IF NOT EXISTS idx_gigs_budget_min ON gigs("budgetMin");

-- applications
CREATE INDEX IF NOT EXISTS idx_applications_gig_id ON applications("gigId");
CREATE INDEX IF NOT EXISTS idx_applications_influencer_id ON applications("influencerId");
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications("userId", "isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications("userId", "createdAt");

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages("receiverId");
CREATE INDEX IF NOT EXISTS idx_messages_application ON messages("applicationId");
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages("receiverId", "isRead");
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages("createdAt");

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews("reviewerId");
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews("revieweeId");
CREATE INDEX IF NOT EXISTS idx_reviews_application ON reviews("applicationId");


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TRIGGERS — auto-maintain updated timestamps
-- ═══════════════════════════════════════════════════════════════════════════

-- Domain tables use camelCase "updatedAt"
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users uses snake_case updated_at (Clerk-era schema)
CREATE OR REPLACE FUNCTION update_users_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at_column();

DROP TRIGGER IF EXISTS update_gigs_updated_at ON gigs;
CREATE TRIGGER update_gigs_updated_at
  BEFORE UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. FUNCTIONS (RPC) — used by Backend/src/services
-- ═══════════════════════════════════════════════════════════════════════════

-- gig.service.js → atomically bump a gig's view counter
CREATE OR REPLACE FUNCTION increment_view_count(gig_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE gigs SET "viewCount" = "viewCount" + 1 WHERE id = gig_id;
END;
$$ LANGUAGE plpgsql;

-- application.service.js → atomic credit debit on hire.
-- The UPDATE reads and writes the balance in a single statement, so two
-- concurrent hires can't lose one write to the other the way a JS-side
-- read-then-write would. Returns no rows when the balance is insufficient.
CREATE OR REPLACE FUNCTION debit_brand_credits(p_brand_id UUID, p_amount INTEGER)
RETURNS TABLE(credits INTEGER) AS $$
  UPDATE brands SET credits = credits - p_amount
  WHERE id = p_brand_id AND credits >= p_amount
  RETURNING credits;
$$ LANGUAGE sql;

-- application.service.js → credit the creator's earned balance from the
-- same hire transaction that debits the brand.
CREATE OR REPLACE FUNCTION credit_influencer_earnings(p_influencer_id UUID, p_amount INTEGER)
RETURNS TABLE(credits INTEGER) AS $$
  UPDATE influencers SET credits = credits + p_amount
  WHERE id = p_influencer_id
  RETURNING credits;
$$ LANGUAGE sql;

-- Utility: aggregate stats for a user (dashboards / future use)
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalGigs', (SELECT COUNT(*) FROM gigs g JOIN brands b ON g."brandId" = b.id WHERE b."userId" = target_user_id),
    'totalApplications', (SELECT COUNT(*) FROM applications a JOIN influencers i ON a."influencerId" = i.id WHERE i."userId" = target_user_id),
    'acceptedApplications', (SELECT COUNT(*) FROM applications a JOIN influencers i ON a."influencerId" = i.id WHERE i."userId" = target_user_id AND a.status = 'ACCEPTED'),
    'averageRating', (SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0) FROM reviews WHERE "revieweeId" = target_user_id),
    'totalReviews', (SELECT COUNT(*) FROM reviews WHERE "revieweeId" = target_user_id),
    'unreadNotifications', (SELECT COUNT(*) FROM notifications WHERE "userId" = target_user_id AND "isRead" = false),
    'unreadMessages', (SELECT COUNT(*) FROM messages WHERE "receiverId" = target_user_id AND "isRead" = false)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
-- All access goes through the Express backend, which authenticates every
-- request with Clerk (middleware/auth.js) and queries Supabase with the
-- anon or service_role key. RLS is enabled with permissive policies for
-- those backend roles — authorization is enforced in the API layer.
-- If the frontend ever queries Supabase directly, tighten these first.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_users" ON users;
DROP POLICY IF EXISTS "anon_all_brands" ON brands;
DROP POLICY IF EXISTS "anon_all_influencers" ON influencers;
DROP POLICY IF EXISTS "anon_all_gigs" ON gigs;
DROP POLICY IF EXISTS "anon_all_applications" ON applications;
DROP POLICY IF EXISTS "anon_all_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_all_messages" ON messages;
DROP POLICY IF EXISTS "anon_all_reviews" ON reviews;

CREATE POLICY "anon_all_users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_brands" ON brands FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_influencers" ON influencers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_gigs" ON gigs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_applications" ON applications FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_notifications" ON notifications FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_messages" ON messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_reviews" ON reviews FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_users" ON users;
DROP POLICY IF EXISTS "auth_all_brands" ON brands;
DROP POLICY IF EXISTS "auth_all_influencers" ON influencers;
DROP POLICY IF EXISTS "auth_all_gigs" ON gigs;
DROP POLICY IF EXISTS "auth_all_applications" ON applications;
DROP POLICY IF EXISTS "auth_all_notifications" ON notifications;
DROP POLICY IF EXISTS "auth_all_messages" ON messages;
DROP POLICY IF EXISTS "auth_all_reviews" ON reviews;

CREATE POLICY "auth_all_users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_brands" ON brands FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_influencers" ON influencers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_gigs" ON gigs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_applications" ON applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_notifications" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_messages" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_reviews" ON reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. GRANTS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. REALTIME
-- ═══════════════════════════════════════════════════════════════════════════
-- Publish key tables for Supabase Realtime. The frontend currently uses
-- 5-second polling (NotificationBell), so this is forward-provisioning.
-- Each ALTER is wrapped to swallow "already a member" on re-runs.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE applications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gigs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. STORAGE
-- ═══════════════════════════════════════════════════════════════════════════
-- Public buckets used by Backend/src/services/storage.js (BUCKETS constant).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gig-media', 'gig-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read; uploads/deletes go through the backend
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read gig-media" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload gig-media" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete gig-media" ON storage.objects;

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Anon upload avatars" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anon delete avatars" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Public read gig-media" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'gig-media');

CREATE POLICY "Anon upload gig-media" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'gig-media');

CREATE POLICY "Anon delete gig-media" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'gig-media');
