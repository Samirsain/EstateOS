<div align="center">

# 🏢 3% Real Estate Management System

**A high-end, photography-first real estate ERP & inventory dashboard inspired by the Apple Design System.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-indigo?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## ✨ Features

- ** Apple Design Aesthetic**: Minimalist UI chrome featuring action blue (`#0066cc`) accents, edge-to-edge layouts, tight SF typography, frosted glass headers (`backdrop-blur-md`), and pill-shaped controls.
- **🏡 Plot & Inventory Management**: Interactive plot status tracking (Available, Hold, Booked, Allotted), project categories (Residential, Commercial, Agriculture), auto-calculated total pricing, and real-time township management.
- **👥 Member Referral System**: Offline dealer & agent onboarding, unique sequential member codes (`3C001`), and automatic customer referral ownership tracking.
- **📑 Customer Onboarding**: Fast buyer registration, plot allotment transactions, and automatic ID sequence generation (`CUST0001`).
- **🔐 Enterprise AES-256 Security**: Sensitive Aadhaar data encrypted at rest with AES-256-GCM and indexed via HMAC-SHA256 blind indexing for duplicate detection.
- **⚡ High-Performance Supabase Backend**: Transitioned to Supabase PostgreSQL with Prisma ORM, request-level permission caching (`React.cache`), and `$transaction` query batching for near-zero latency.

---

## 🛠️ Tech Stack

| Domain | Technology |
|---|---|
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Database & ORM** | [Supabase PostgreSQL](https://supabase.com/) + [Prisma ORM](https://www.prisma.io/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/) + Custom Apple Design Tokens |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Auth & Security** | JWT (HS256) `httpOnly` Session + Node Crypto (scrypt / AES-256-GCM) |

---

## 🔑 Roles & Permissions

- **MD (Managing Director)**: Full administrative authority — dashboard overview, inventory management, member onboarding, customer assignment, settings, and user management.
- **PC (Process Coordinator)**: Day-to-day office management — plot allotments, member & customer registration, form printing, and inventory search.

---

## 🚀 Quick Start Guide

### 1. Clone the repository
```bash
git clone https://github.com/Samirsain/3d.git
cd 3d
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables Setup
Create a `.env` file in the root directory (or copy `.env.example`):

```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
APP_SECRET="c8e7943fa109825b42d1396a8f7b5e3c1d90a42e56f71893c0d24e18b9561234"
```

### 4. Database Setup & Seeding
Push the Prisma schema to Supabase PostgreSQL and seed default roles & admin credentials:

```bash
npx prisma db push
npx tsx scripts/seed-supabase.ts
```

### 5. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👤 Default Admin Credentials

| Role | Username | Password |
|---|---|---|
| **Managing Director (MD)** | `md` | `ChangeMe@123` |

---

## 🌐 Vercel Deployment

Deploy seamlessly to [Vercel](https://vercel.com/):

1. Import the repository in Vercel.
2. Add the environment variables:
   - `DATABASE_URL` (Supabase Transaction Pooler URL, Port 6543)
   - `DIRECT_URL` (Supabase Direct URL, Port 5432)
   - `APP_SECRET` (32-byte secret string)
3. Deploy! Next.js will automatically compile and optimize the production bundle.

---

<div align="center">
  <sub>Built with ❤️ for <strong>3% Real Estate</strong></sub>
</div>
