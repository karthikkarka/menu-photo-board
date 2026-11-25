# Menu Photo Board — Cafe Menu Photography Pipeline Tracker

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=flat&logo=vercel)](https://menu-photo-board.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat&logo=nextdotjs)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Menu Photo Board** is a single-screen operational web app built for small cafes and restaurants to ensure no dish goes unphotographed on **Zomato, Swiggy, and Instagram**. Staff tap any dish card to advance it through a 4-stage pipeline while watching a real-time *"No Photo"* deficit counter at the top of the screen.

> **Note:** Pre-seeded sample dishes and menu items represent **sample cafe data** for demonstration.

---

## Live Demo

* **Production URL:** [https://menu-photo-board.vercel.app](https://menu-photo-board.vercel.app)

---

## How It Works

Every menu item moves sequentially across four operational stages:

1. **No Photo** — Dish lacks a commercial-quality photo.
2. **Photo Taken** — Raw photograph captured in the kitchen/counter.
3. **Photo Edited** — Color-corrected, cropped, and ready for upload.
4. **Live** — Published across Zomato, Swiggy, and Instagram.

### Key Features
* **Single-Screen Dashboard:** View all dishes, stage counts, and completion status without multi-page navigation.
* **Optimistic One-Tap Advancement & Step-Back Undo:** Instant stage transitions backed by Supabase PostgreSQL, with an undo/step-back guard against accidental taps.
* **Live Deficit Counter:** Real-time headline counter showing how many dishes still lack a proper photo.
* **Filtering & Search:** Filter by menu category, workflow stage, or search query, plus an inline modal to add new dishes.
* **Resilient State Testing (`?test=`):** Built-in query overrides (`?test=missing_setting`, `?test=supabase_error`, `?test=empty_table`) to verify graceful error and onboarding states.

---

## Tech Stack

* **Framework:** Next.js 15 (App Router), React 19, TypeScript
* **Styling:** Tailwind CSS, Lucide React
* **Database:** Supabase (PostgreSQL `dishes` table)
* **Deployment:** Vercel

---

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and add your Supabase project credentials:
   ```bash
   cp .env.example .env.local
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## Project Structure

```text
menu-photo-board/
├── src/
│   ├── app/
│   │   ├── page.tsx            # Single-screen pipeline board & Supabase CRUD
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   └── supabaseClient.ts   # Safe Supabase client & config validator
│   └── types/
│       └── dish.ts             # 4-stage pipeline config & Dish model
├── PRD.md                      # Product Requirements Document
├── TECH-STACK.md               # Architecture & scaling decisions
└── IMPLEMENTATION-PLAN.md      # Mobile-first implementation milestones
```

---

## Related PlateAndPost Repositories

* **PlateAndPost Website:** [onfroy69/PlateAndPost](https://github.com/onfroy69/PlateAndPost)
* **n8n Cafe Automations:** [onfroy69/n8n-cafe-automations](https://github.com/onfroy69/n8n-cafe-automations)
* **Automated Proposals & Offers:** [onfroy69/plateandpost-solution-proposals](https://github.com/onfroy69/plateandpost-solution-proposals)

---

## License

MIT License — Copyright (c) 2026 Karthik Karka. See [LICENSE](./LICENSE).
