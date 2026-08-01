# Customer & Member Management System (CMMS)

A centralised office management system for member registration, customer
onboarding, duplicate prevention and referral ownership, built against the
Customer & Member Management PRD v2.0.

Built on **Next.js 16** (App Router, Server Actions, Turbopack) with
**React 19**, TypeScript, Tailwind CSS v4 and SQLite (`better-sqlite3`).

> This project targets a pre-release Next.js. Check
> `node_modules/next/dist/docs/` before assuming an API from older Next.js
> versions still applies — the `middleware.ts` convention, for example, is
> renamed to `proxy.ts` here.

## Roles

- **MD (Managing Director)** — full access: dashboard, reports, members,
  customers, transfers, settings, audit logs, exports.
- **PC (Process Coordinator)** — registers members and customers, assigns
  customers to members, searches records, prints forms, views reports.
  Cannot transfer ownership, delete records, or manage users.
- **Member** — an offline referral partner. Has no login; refers customers
  by quoting their invite code to the PC.

Permissions are enforced in three places: `src/proxy.ts` (route-level
redirect), `requirePermission`/`assertPermission` in `src/lib/auth.ts` (page
and server-action guards), and UNIQUE constraints in the SQLite schema
(last-resort data integrity).

## Business rules enforced

- One mobile number = one customer (`UNIQUE` + pre-insert check).
- One Aadhaar number = one customer (`UNIQUE` on a keyed blind index + check).
- One customer = one member, permanently, until transferred.
- Only the MD can transfer customer ownership (audited).
- Every create, duplicate-block, login, transfer, and export is written to
  the audit log.
- Customer IDs: `TM0001-DDMMYYYY`. Member IDs: `3C0001-DDMMYYYY`. Both are
  sequential, monotonic and never reused, generated inside the same
  transaction as the insert that consumes them.

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
customers so the dashboard, charts and reports have something to show.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `APP_SECRET` | Key material for session signing, field encryption and the Aadhaar/mobile blind index. **Required in production** — generate with `openssl rand -hex 32`. | dev-only fallback |
| `CMMS_DB_PATH` | SQLite file location. | `./data/cmms.db` |
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
- CSV exports escape spreadsheet-formula injection and are gated by the same
  permission checks as the pages.

## Project structure

```
src/
  app/
    login/                  Sign-in
    (app)/                  Authenticated shell (nav, header)
      dashboard/            Cards + charts
      members/  customers/  CRUD, search, print forms
      transfers/            MD-only ownership transfer
      reports/              Daily/weekly/monthly/yearly + CSV export
      audit/                MD-only audit log + duplicate attempts
      settings/             MD-only user management
    api/export/             CSV export route
  components/               Shared UI, charts, nav, print sheet
  lib/                       db, auth, session, crypto, ids, queries, reports
  proxy.ts                   Route protection (Next 16's middleware)
scripts/seed.ts               Demo data seed
```
