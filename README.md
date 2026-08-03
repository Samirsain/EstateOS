# Customer & Member Management System (CMMS)

A centralised office management system for member registration, customer
tracking and referral ownership.

Built on **Next.js 16** (App Router, Server Actions, Turbopack) with
**React 19**, TypeScript, Tailwind CSS v4 and SQLite via
**[libSQL](https://turso.tech/libsql)** (`@libsql/client`) — a local file in
development, [Turso](https://turso.tech) in production.

> This project targets a pre-release Next.js. Check
> `node_modules/next/dist/docs/` before assuming an API from older Next.js
> versions still applies — the `middleware.ts` convention, for example, is
> renamed to `proxy.ts` here.

## Roles

- **MD (Managing Director)** — full access: dashboard, members, customers,
  settings.
- **PC (Process Coordinator)** — registers and edits members, views
  customers, searches records, prints forms. Cannot manage user accounts.
- **Member** — an offline referral partner. Has no login. A member's
  referral code is simply their Member ID.

Permissions are enforced in three places: `src/proxy.ts` (route-level
redirect), `requirePermission`/`assertPermission` in `src/lib/auth.ts` (page
and server-action guards), and UNIQUE constraints in the SQLite schema
(last-resort data integrity).

## Business rules enforced

- One mobile number = one customer (`UNIQUE` on the column).
- One Aadhaar number = one customer (`UNIQUE` on a keyed blind index).
- One customer = one member, permanently.
- A member's referral code is their Member ID — no separate invite code.
- Member IDs: `3C000`, `3C001`, `3C002`... (3 digits). Customer IDs: `TM0000`,
  `TM0001`, `TM0002`... (4 digits). Both are sequential, monotonic and never
  reused, generated inside the same transaction as the insert that consumes
  them.

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. On first run the database is created at
`data/cmms.db` with a default MD account:

- username `md`, password `ChangeMe@123` (override with `CMMS_MD_USERNAME`
  / `CMMS_MD_PASSWORD` env vars before the first run)

Sign in as MD and create a PC account from **Settings**, or seed demo data:

```bash
npm run seed
```

This creates a PC account (`pc` / `Office@123`), six members and ~25
customers so the dashboard has something to show.

## Deploying to Vercel (or any serverless host)

Vercel's filesystem is **read-only** in production, so the local SQLite file
under `data/` cannot be created there. The app already handles this — when
`TURSO_DATABASE_URL` is set it talks to a remote [Turso](https://turso.tech)
database over HTTP instead of opening a local file; without it, it falls back
to `data/cmms.db`, which only works on a host with a writable, persistent
disk (a normal VM, Railway, Render, Fly.io, etc.).

To deploy on Vercel:

1. **Create a free Turso database** — [turso.tech](https://turso.tech), sign
   up, then either use the web dashboard or the CLI:
   ```bash
   turso db create cmms
   turso db show cmms --url          # -> TURSO_DATABASE_URL
   turso db tokens create cmms       # -> TURSO_AUTH_TOKEN
   ```
2. **Add environment variables** in the Vercel project (Settings → Environment
   Variables):
   - `TURSO_DATABASE_URL` — the `libsql://...` URL from step 1
   - `TURSO_AUTH_TOKEN` — the token from step 1
   - `APP_SECRET` — `openssl rand -hex 32` (required in production; the app
     throws on first request without it)
   - optionally `CMMS_MD_USERNAME` / `CMMS_MD_PASSWORD` to set the initial MD
     login instead of the `md` / `ChangeMe@123` default
3. **Redeploy.** The schema and the initial MD account are created
   automatically on first request — no separate migration step.

Local development is unaffected: without `TURSO_DATABASE_URL` set, `npm run
dev` and `npm run seed` keep using `data/cmms.db` as before.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `APP_SECRET` | Key material for session signing, field encryption and the Aadhaar/mobile blind index. **Required in production** — generate with `openssl rand -hex 32`. | dev-only fallback |
| `TURSO_DATABASE_URL` | Remote libSQL/Turso database URL. When unset, falls back to a local SQLite file — **must be set on Vercel or any host with a read-only filesystem**. | unset (local file) |
| `TURSO_AUTH_TOKEN` | Auth token for the Turso database above. | unset |
| `CMMS_DB_PATH` | Local SQLite file location, used only when `TURSO_DATABASE_URL` is unset. | `./data/cmms.db` |
| `CMMS_MD_USERNAME` / `CMMS_MD_PASSWORD` | Initial MD account, used only when the `users` table is empty. | `md` / `ChangeMe@123` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Run the production build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run seed` | Seed demo members, customers and a PC account. |

## Security notes

- Aadhaar numbers are encrypted at rest with AES-256-GCM; duplicate checks
  run against an HMAC-SHA256 blind index, never the plaintext or the
  ciphertext. Only the last 4 digits are ever rendered in the UI.
- Passwords are hashed with scrypt.
- Sessions are signed JWTs (HS256) in an `httpOnly`, `sameSite=lax` cookie,
  8-hour expiry.

## Project structure

```
src/
  app/
    login/                  Sign-in
    (app)/                  Authenticated shell (nav, header)
      dashboard/            Cards + charts
      members/               CRUD, search, print forms
      customers/             View, search, print forms (view-only)
      settings/              MD-only user management
  components/               Shared UI, charts, nav, print sheet
  lib/                       db (libSQL/Turso), auth, session, crypto, ids, queries
  proxy.ts                   Route protection (Next 16's middleware)
scripts/seed.ts               Demo data seed
```
