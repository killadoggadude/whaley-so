# Project Setup Directive

## Overview
Complete setup procedure for the AI OFM SaaS tool.

## Tech Stack
- **Framework**: Next.js 16 (App Router) in `web/` subdirectory
- **UI**: shadcn/ui (new-york style) + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + Auth)
- **Storage**: Cloudflare R2 (S3-compatible, no egress fees)
- **Auth**: Supabase Auth (email/password)

## Prerequisites
- Node.js 24+
- Supabase project created (free tier)
- Cloudflare R2 bucket created (optional, can defer)

## Setup Commands
```bash
# From project root
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd web
npx shadcn@latest init -d
npx shadcn@latest add button card input label
npm install @supabase/supabase-js @supabase/ssr
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Environment Variables
File: `web/.env.local`

| Variable | Public | Purpose |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | No | Server-side only |
| R2_ACCOUNT_ID | No | Cloudflare account |
| R2_ACCESS_KEY_ID | No | R2 API access key |
| R2_SECRET_ACCESS_KEY | No | R2 API secret |
| R2_BUCKET_NAME | No | R2 bucket name |
| R2_ENDPOINT | No | R2 S3 endpoint |
| NEXT_PUBLIC_APP_URL | Yes | App base URL |

## Database Setup
Run `web/supabase/migrations/20260207000000_initial_schema.sql` in Supabase Dashboard SQL Editor.

This creates:
- `public.users` — user profiles linked to auth.users
- `public.user_api_keys` — encrypted third-party API keys
- RLS policies on both tables
- Auto-create trigger for user profiles on signup
- Auto-update trigger for updated_at columns

## Auth Flow
1. Supabase Auth handles email/password signup/login
2. `middleware.ts` refreshes sessions on every request
3. Unauthenticated users redirected from `/dashboard` to `/login`
4. Auth callback at `/auth/callback` handles email confirmation redirects

## Key Architecture Decisions
- Next.js app lives in `web/` to separate from AI agent tooling
- `@supabase/ssr` (not deprecated auth-helpers) for cookie-based sessions
- `getUser()` over `getSession()` in middleware for security
- Client-side auth forms for immediate UX feedback
- Manual TypeScript types (switch to generated types later)

## Verification
1. `npm run dev` — landing page at localhost:3000
2. Sign up — creates auth user + public.users row
3. Login — redirects to /dashboard
4. Sign out — redirects to /login
5. Direct /dashboard when logged out — redirects to /login
6. `npm run build` — no errors
