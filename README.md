# Coffee App

A mobile-first directory of specialty coffee shops and roasters in Bali, then the rest of Indonesia. Phase 1 is a curated directory entered by an admin, plus a light community layer: anonymous thumbs up/down and shop submissions that an admin reviews.

"Coffee App" is a working name. Every brand string lives in [src/lib/brand.ts](src/lib/brand.ts).

## Stack

- Next.js 16 (App Router, Cache Components) with React 19 and TypeScript
- Supabase: Postgres, Auth (email one-time codes), row level security, Edge Functions
- Styling from the Coffee App design system: tokens in [src/styles/tokens.css](src/styles/tokens.css), component CSS in [src/styles/components.css](src/styles/components.css), React components in [src/components/ui](src/components/ui)
- React Hook Form and Zod for the admin form, Cloudflare Turnstile on the public submission form
- Tests: pgTAP (database), Vitest (unit), Playwright (end to end)

## Run it locally

You need Node 24 and Docker Desktop (running).

```sh
npm install
cp .env.example .env.local
cp supabase/functions/.env.example supabase/functions/.env
npm run db:start                         # local Supabase, with migrations and sample data
npm run admin:add -- you@example.com     # invite yourself as an admin
npm run dev                              # http://localhost:3000
```

Sign in at <http://localhost:3000/admin>. Locally, sign-in emails go to Mailpit at <http://127.0.0.1:54324>, where you'll find the 6-digit code. Supabase Studio is at <http://127.0.0.1:54323>.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (needs the database running: some pages prerender) |
| `npm run typecheck` | Generates route types, then runs TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run db:test` | Database tests (pgTAP): RLS, change history, votes, search |
| `npx playwright test` | End-to-end tests against the dev server and local Supabase |
| `npm run db:reset` | Rebuild the local database from migrations and seed. Clears test data |
| `npm run db:types` | Regenerate [database.types.ts](src/lib/supabase/database.types.ts) after a schema change |
| `npm run admin:add -- email` | Invite an admin |

## How it fits together

- **Schema**: [supabase/migrations](supabase/migrations). These migrations have run on the live database, so never edit them: every schema change goes in a new migration file (`npx supabase migration new <name>`), applied with `npx supabase db push`.
- **Option lists** (areas, roast levels and so on) are data, edited at `/admin/options`. The seed fills them locally only. Two values have meaning in code: the roast slugs `light`, `medium` and `dark` draw the roast scale, and the bean origin slug `both` matches either single origin in the filters. A slug comes from the label when an option is added and never changes, so rename labels freely.
- **Visitors** read through the Data API as the anonymous role; RLS hides hidden shops. They write only through two Edge Functions, [vote](supabase/functions/vote/index.ts) and [submit-shop](supabase/functions/submit-shop/index.ts), which hash the caller's IP and call rate-limited database functions with the service role.
- **Admins** are users with a row in `public.admins`, invited with `npm run admin:add`. Sign-up is off. Admin writes go through Server Actions acting as the signed-in admin, so RLS applies to them too.
- **Change history** is written by a database trigger on `shops`, one revision per save, so no code path can edit a shop without leaving a record.
- **Caching**: public reads are cached ([src/lib/shops.ts](src/lib/shops.ts)) and refreshed when an admin saves. Vote counts on lists may lag by up to a minute; the vote buttons fetch fresh counts for shops the visitor has voted on.

## Environments

The app is deployed to Vercel at <https://coffee-app-five-gray.vercel.app/>, with its own hosted Supabase project.

Local, staging and production each have their own Supabase project. To set up a hosted one:

1. Create the Supabase project and push the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
2. In Authentication settings, keep the Email provider on and turn off "Allow new users to sign up". Set the magic link email template to show `{{ .Token }}` (see [supabase/templates/sign-in-code.html](supabase/templates/sign-in-code.html)), and set up SMTP for real email delivery.
3. Deploy the functions: `npx supabase functions deploy vote --no-verify-jwt` and the same for `submit-shop`. Set their secrets: `npx supabase secrets set IP_HASH_SALT=<random> TURNSTILE_SECRET_KEY=<from Cloudflare>`.
4. Enable `pg_cron` (the nightly vote refresh is scheduled by the migrations) and point-in-time recovery once the data matters.
5. In Vercel, set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. The app never needs the secret key.
6. Invite admins: put that project's URL and secret key in a local env file and run `npm run admin:add`.

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs every check above on each push once the repository is on GitHub.
