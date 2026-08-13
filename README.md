<div align="center">

# EstateOS

### Modern Real Estate Management Platform

A powerful, secure, and scalable real estate ERP designed to manage properties, projects, plots, inventory, customers, dealers, referrals, and day-to-day operations from one unified platform.

<br />

<img
  src="https://raw.githubusercontent.com/Samirsain/EstateOS/claude/nextjs-latest-setup-w5d897/public/Screenshot%202026-08-13%20174813.png"
  alt="EstateOS Dashboard"
  width="100%"
/>

<br />
<br />

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-v4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment-black?style=flat-square&logo=vercel)](https://vercel.com/)

</div>

---

## Overview

**EstateOS** is a modern real estate management platform built to simplify and centralize property business operations.

It brings **project management, plot inventory, customer management, dealer/member management, referrals, and plot allotments** into one unified workspace.

EstateOS is designed with a premium, minimal interface while keeping business workflows simple enough for everyday office users.

---

## Why EstateOS?

Real estate businesses often manage property inventory, customers, dealers, and allotments across spreadsheets, paperwork, and disconnected systems.

EstateOS brings these workflows together into a single platform.

### One platform for

- 🏢 Projects
- 🏡 Properties
- 📍 Plot Inventory
- 👥 Customers
- 🤝 Dealers & Members
- 🔄 Referrals
- 📑 Plot Allotments
- 🔐 Users & Permissions
- 📊 Business Operations

---

## Product Preview

<div align="center">

<img
  src="https://raw.githubusercontent.com/Samirsain/EstateOS/claude/nextjs-latest-setup-w5d897/public/Screenshot%202026-08-13%20174813.png"
  alt="EstateOS Dashboard"
  width="100%"
/>

<br />

### EstateOS Dashboard

A centralized overview of property inventory, customers, members, and business operations.

</div>

---

# Features

## 🏡 Property & Plot Management

Manage complete property inventories from a centralized dashboard.

- Project and township management
- Residential projects
- Commercial projects
- Agriculture projects
- Plot inventory management
- Plot dimensions
- Plot pricing
- Availability tracking
- Hold status
- Booked status
- Allotted status
- Automatic price calculations
- Inventory search
- Centralized property records

---

## 👥 Customer Management

Manage customer information throughout the property lifecycle.

- Customer onboarding
- Unique customer ID generation
- Buyer information management
- Customer referral tracking
- Plot assignment
- Plot allotment records
- Centralized customer database
- Customer ownership tracking

---

## 🤝 Dealer & Member Management

Manage dealers, agents, and referral members from one place.

- Dealer onboarding
- Member registration
- Unique member codes
- Referral ownership
- Customer-member relationships
- Member tracking
- Dealer information management

---

## 📑 Plot Allotment

Simplify the process of assigning properties to customers.

- Customer selection
- Plot selection
- Member/referral selection
- Allotment records
- Property status updates
- Transaction-based database operations
- Centralized allotment history

---

## 📊 Management Dashboard

Get a quick overview of important business operations.

- Property inventory overview
- Available plots
- Booked plots
- Allotted plots
- Customer statistics
- Member/dealer statistics
- Project overview
- Quick actions
- Operational insights

---

## 🔐 Role-Based Access Control

EstateOS supports multiple roles with different levels of access.

### Managing Director — MD

Full administrative access.

- Dashboard
- Projects
- Property inventory
- Customers
- Members
- Plot allotments
- User management
- Settings
- System administration

### Process Coordinator — PC

Operational access for day-to-day workflows.

- Customer registration
- Member registration
- Plot allotment
- Inventory search
- Form printing
- Property operations

---

# Screenshots

## Dashboard

<div align="center">

<img
  src="https://raw.githubusercontent.com/Samirsain/EstateOS/claude/nextjs-latest-setup-w5d897/public/Screenshot%202026-08-13%20174813.png"
  alt="EstateOS Dashboard"
  width="100%"
/>

</div>

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 — App Router |
| **Language** | TypeScript |
| **Database** | Supabase PostgreSQL |
| **ORM** | Prisma |
| **Styling** | Tailwind CSS v4 |
| **UI & Animation** | Framer Motion |
| **Authentication** | JWT + HTTP-only Sessions |
| **Password Security** | Node.js `scrypt` |
| **Encryption** | AES-256-GCM |
| **Deployment** | Vercel |

---

# Architecture

```text
                         EstateOS
                            │
                            ▼
                    ┌───────────────┐
                    │   Next.js 16  │
                    │  App Router   │
                    └───────┬───────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Server Actions /  │
                  │      APIs         │
                  └─────────┬─────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Prisma ORM  │
                    └───────┬───────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Supabase PostgreSQL │
                 └─────────────────────┘
