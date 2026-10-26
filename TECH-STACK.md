# Tech Stack Architecture: Menu Photo Board

This document answers one question: **what do we build it with, and why that?**

Every architectural choice below is governed strictly by two inputs:
1. **The PRD requirements:** A single-screen operational board tracking menu dishes across four stages, requiring real-time counter updates, single-touch advancement, accidental tap correction, category filtering, sub-2-second interaction speed, and tenant isolation for cafes.
2. **The scale:** Exactly **100 users** across 10 to 20 cafes. Not web-scale, not enterprise.

---

## 1. Database & Real-Time Sync

* **The Choice:** PostgreSQL hosted on **Supabase** (Single Project).
* **The Constraint that forced it:** 
  Multiple cafe staff (e.g. floor supervisor at the billing counter tablet, freelance photographer on mobile in the kitchen) operate on the same menu simultaneously. When one person taps a dish, other open screens in that cafe must reflect the stage transition immediately without manual page refreshes or polling. Furthermore, calculating the headline deficit metric (*"how many dishes still have no proper photo"*) across categories requires relational aggregation (`COUNT(*) WHERE stage = 'no_photo'`).
* **Free Tier Ceiling & Upgrade Trigger:**
  * *Supabase Free Tier Limits:* 500 MB database storage, 200 concurrent Realtime WebSocket connections, 500,000 monthly active rows.
  * *Our 100-User Footprint:* 20 cafes × 100 dishes = 2,000 dish rows total (< 10 MB including indexes). Peak concurrent connections across 20 cafes will never exceed 30.
  * *The exact limit that would force an upgrade:* **7-day inactivity pause.** Supabase free tier pauses projects after 7 consecutive days without API requests. Daily cafe usage prevents this, or a zero-cost scheduled ping (e.g. GitHub Actions cron) prevents sleeping. Storage will not force an upgrade for years unless image binary files are incorrectly stored directly inside database rows (prohibited: images belong in Storage).
* **What was rejected, and why:**
  * *Firebase / Firestore:* Rejected because Firestore's NoSQL document structure requires client-side denormalization to compute category counts and headline deficits, and bills per document read. An active 100-dish board streaming changes to multiple tablets rapidly exhausts free read/write quotas compared to streaming table changes over Postgres CDC.
  * *Turso / SQLite at the Edge:* Rejected because SQLite lacks native built-in row-level security (RLS) and managed WebSocket pub/sub. We would be forced to deploy and maintain a custom Node/WebSocket server to authorize and broadcast events.
  * *Standalone PostgreSQL on Render/Railway:* Rejected because their free tiers sleep after 15 minutes of idle time (causing 30-50 second cold-start database locks) or enforce hard monthly credit caps that shut down the database mid-month.
* **MVP vs. Production:**
  * *MVP:* Direct queries via `@supabase/supabase-js` targeting tables: `cafes`, `categories`, `dishes`. Row Level Security (RLS) policies isolate cafes.
  * *Production:* Add composite database indexes: `CREATE INDEX idx_dishes_cafe_stage ON dishes(cafe_id, stage)` and `CREATE INDEX idx_dishes_cafe_category ON dishes(cafe_id, category_id)`. Limit Realtime replication explicitly to the `dishes` table.
  * *Type of change:* **Config switch** (One SQL migration run via Supabase dashboard or CLI; zero application code rewritten).

---

## 2. Authentication & Multi-Tenant Authorization

* **The Choice:** **Supabase Auth** with PostgreSQL Row Level Security (RLS).
* **The Constraint that forced it:**
  Staff hands are busy with food prep and register duties; authentication cannot require complex multi-factor hoops, yet Cafe A must be strictly barred from viewing or editing Cafe B's menu. RLS pushes tenant isolation down to the database engine: every database query implicitly executes `WHERE cafe_id = auth.uid()` (or cafe team membership). If a frontend developer writes a sloppy query, the database itself refuses to leak or overwrite another cafe's dishes.
* **Free Tier Ceiling & Upgrade Trigger:**
  * *Supabase Free Tier Limits:* 50,000 Monthly Active Users (MAUs).
  * *Our 100-User Footprint:* 100 users is 0.2% of the free quota.
  * *The exact limit that would force an upgrade:* **Default SMTP rate limits.** Supabase free tier limits outbound authentication emails (magic links / invites) to 30 emails per hour via their shared mailer. If all 100 staff are onboarded in the same morning, invites get throttled.
  * *Fix:* Hook up a free external SMTP provider (Resend free tier: 3,000 emails/month, 100/day) inside Supabase settings. Cost: $0.
* **What was rejected, and why:**
  * *Clerk / Auth0:* Rejected because they introduce an unnecessary second vendor, possess separate free-tier project restrictions, and require writing webhook sync logic to mirror user IDs into PostgreSQL.
  * *Custom JWT / Session Cookies in Node.js:* Rejected because rolling custom password hashing, token expiration, and session storage introduces security vulnerability risks and ongoing maintenance overhead for an internal 100-user tool.
  * *Shared Cafe Password without Auth:* Rejected because lacking identity tokens prevents database RLS from enforcing tenant boundaries, allowing any user to tamper with network payloads and corrupt rival cafe menus.
* **MVP vs. Production:**
  * *MVP:* Single email-and-password account per cafe (e.g., `counter@artisanbrew.com`). The counter tablet logs in once and the session token persists indefinitely in browser local storage.
  * *Production:* Email magic-link invites for distinct staff roles (`owner`, `manager`, `photographer`) using custom SMTP via Resend, with roles stored in user metadata to control dish deletion permissions.
  * *Type of change:* **Config switch** (Adding custom SMTP keys in Supabase dashboard and additive SQL RLS policy rules; zero frontend screens rewritten).

---

## 3. Frontend Framework & State Management

* **The Choice:** **React + Vite** (Single Page Application) with **TypeScript**, **Tailwind CSS**, and **TanStack Query** (React Query).
* **The Constraint that forced it:**
  The PRD specifies a single-screen operational dashboard for internal cafe use. SEO is completely irrelevant (public search engines are explicitly out of scope). The PRD's paramount operational constraint is **"Under 2 seconds to locate a dish and record a stage advancement."** A static client bundle loaded onto a tablet runs locally without server cold starts. Using TanStack Query allows **Optimistic Updates**: when staff tap a dish, the UI card advances in **0 milliseconds** locally, while syncing to PostgreSQL in the background. If the cafe Wi-Fi hiccups, it rolls back gracefully and notifies the user.
* **Free Tier Ceiling & Upgrade Trigger:**
  * *Hosting Limits (Vercel):* 100 GB bandwidth / month.
  * *Our 100-User Footprint:* A gzipped Vite production bundle is ~180 KB. 100 users loading the board 5 times a day consumes ~2.7 GB/month (< 3% of bandwidth allowance). It will never hit the bandwidth limit.
  * *The exact limit that would force an upgrade:* None on bandwidth. Only Vercel's commercial terms if enforced (mitigated by switching to Cloudflare Pages at $0 if ever challenged).
* **What was rejected, and why:**
  * *Next.js (App Router / Server Components):* Rejected. Next.js is built for public e-commerce, media publishing, and SEO. For an authenticated, single-screen internal application, Next.js serverless functions on Vercel free tier experience cold starts (2 to 4 seconds of idle latency), which violates the sub-2-second interaction requirement. Furthermore, managing real-time WebSocket subscriptions across server component boundaries introduces unnecessary architectural friction.
  * *Vanilla JavaScript / jQuery:* Rejected because managing optimistic stage transitions, instant rollback, dynamic deficit recalculation, and multi-category filtering across 100 dishes in imperative DOM code produces brittle spaghetti that breaks when adding new filters.
  * *Redux / Zustand:* Rejected as redundant. Server state belongs in TanStack Query (which already handles caching, refetching, and optimistic updates), while local UI state (current selected category, search filter) needs nothing more than standard React state.
* **MVP vs. Production:**
  * *MVP:* Direct state updates using `@supabase/supabase-js` client listeners inside React component state.
  * *Production:* Standardized TanStack Query cache with mutation hooks and optimistic UI updates for instant tap feedback and offline resilience.
  * *Type of change:* **Incremental Refactor** (Wrapping fetch functions in `useQuery` / `useMutation`; JSX layout and CSS remain 100% untouched).

---

## 4. Hosting & Deployment

* **The Choice:** **Vercel** (Hobby Free Tier) connected to Git repository.
* **The Constraint that forced it:**
  Zero-maintenance CI/CD. Every Git commit triggers an automated build with unique preview URLs for verification before pushing to production, satisfying the harness rule requiring local verification and zero devops server management.
* **Free Tier Ceiling & Upgrade Trigger:**
  * *Vercel Free Tier Limits:* 100 GB edge network bandwidth, 100 deployments per day, unlimited automatic SSL.
  * *The exact limit that would force an upgrade:* Vercel Hobby tier terms state it is for non-commercial personal projects. For 100 internal cafe users generating under 3 GB/month, this is rarely flagged. If Vercel ever issues a compliance notice, moving the static Vite `dist` folder to **Cloudflare Pages** takes 5 minutes and offers unlimited bandwidth with free commercial usage.
* **What was rejected, and why:**
  * *AWS (S3 + CloudFront + ACM + Route53):* Rejected because AWS free tier expires after 12 months, requires managing complex IAM roles, bucket policies, and invalidations, and introduces billing surprise risks if credentials leak.
  * *Render / Railway:* Rejected for frontend static hosting because their compute tiers spin down after inactivity, introducing needless latency.
  * *Self-hosted VPS (DigitalOcean / Hetzner):* Rejected because managing Linux security patches, Nginx configurations, and Let's Encrypt certificate renewals burns hours of human maintenance for a 100-user static web app.
* **MVP vs. Production:**
  * *MVP:* Deployed directly to standard `*.vercel.app` domain.
  * *Production:* Add cafe brand custom domain (e.g. `board.ourcafe.com`) configured via Vercel Edge DNS.
  * *Type of change:* **Config switch** (One domain entry added in Vercel dashboard; 0 code changes).

---

## 5. Server Functions / Edge Functions

* **The Choice:** **Supabase Edge Functions** (Deno / TypeScript).
* **The Constraint that forced it:**
  Phase 1 (MVP) requires **zero server functions**. Direct client-to-database communication guarded by PostgreSQL RLS handles all reads and stage updates safely. For Phase 2 (bulk menu spreadsheet/CSV import parsing) and Phase 3 (webhook triggers for external platforms), server logic is executed inside the existing Supabase project, avoiding a third-party compute provider.
* **Free Tier Ceiling & Upgrade Trigger:**
  * *Supabase Free Tier Limits:* 500,000 Edge Function invocations / month.
  * *Our 100-User Footprint:* Phase 1 invokes 0 functions. Phase 2 menu imports occur once per month per cafe (~20 invocations/month). Usage is < 0.01% of the free tier.
  * *The exact limit that would force an upgrade:* Exceeding 500k invocations or 2 MB payload size limits. Impossible at 100-user scale.
* **What was rejected, and why:**
  * *Node.js / Express server on Railway / Render:* Rejected because hosting a dedicated backend server costs $5–$7/month or suffers from idle sleep cycles, violating the zero-maintenance, zero-idle-sleep constraint.
  * *AWS Lambda via Serverless Framework:* Rejected because it introduces AWS vendor credentials, deployment templates, and split monitoring outside Supabase.
* **MVP vs. Production:**
  * *MVP:* **None.** Phase 1 uses zero server functions.
  * *Production:* Exactly 1 Supabase Edge Function: `parse-menu-upload` to ingest, validate, and bulk-insert CSV/Excel dish rosters for Phase 2 onboarding.
  * *Type of change:* **Additive feature** (Creating a new directory under `supabase/functions/`; zero modifications to existing Phase 1 application code).

---

## 6. Image & Asset Storage (PRD Phase 2 Demand)

* **The Choice:** **Supabase Storage** (Single Private Bucket: `dish-thumbnails`) with Client-Side Image Compression.
* **The Constraint that forced it:**
  PRD Phase 1 is pure status/text tracking (no images). Phase 2 introduces thumbnail previews so managers can review photos before confirming them live. Image assets must share the same tenant isolation as the database (a manager at Cafe A must not see Cafe B's photos). Using Supabase Storage allows PostgreSQL RLS policies to govern storage object access directly (`storage.objects` table).
* **Free Tier Ceiling & Upgrade Trigger:**
  * *Supabase Free Tier Limits:* 1 GB file storage, 2 GB file bandwidth / month.
  * *Storage Math & Strict Architectural Rule:* Professional cameras produce 10 MB to 25 MB RAW/JPEG files. If 20 cafes upload 100 raw photos (2,000 files × 10 MB = 20 GB), the free tier is exceeded immediately.
  * *The Mandatory Client Constraint:* **Client-side compression before upload.** The browser resizes images to a maximum width of 1000px and converts to WebP/JPEG at 80% quality (resulting in ~100 KB per photo). 2,000 dishes × 100 KB = **200 MB total storage** (20% of the 1 GB free limit).
  * *The exact limit that would force an upgrade:* If cafes upload uncompressed raw files, hitting the 1 GB storage ceiling forces an upgrade to Supabase Pro ($25/month).
* **What was rejected, and why:**
  * *Storing Base64 strings in PostgreSQL table rows:* Rejected completely. Storing image bytes in database columns balloons database size, destroys table scanning performance, and exhausts the 500 MB database free limit within 50 photos.
  * *AWS S3 + CloudFront:* Rejected because it introduces AWS IAM access keys, CORS configuration headaches, and separate billing for a small thumbnail preview feature.
  * *Cloudinary:* Rejected because its transformation credit system is unpredictable and easily exhausted when multiple mobile devices request thumbnails at varying viewport sizes.
* **MVP vs. Production:**
  * *MVP:* **None.** PRD Phase 1 specifies zero image storage.
  * *Production:* Supabase Storage bucket created with client-side compression utility (`browser-image-compression`) integrated into the dish card.
  * *Type of change:* **Additive feature** (Adding file input component and storage upload hook in Phase 2; zero rewrite of Phase 1 stage tracking).

---

## 7. Development vs. Production on ONE Supabase Project

* **The Constraint:** Exactly one Supabase cloud project permitted.
* **The Solution:**
  * **Local Development via Supabase CLI:** Developers run `supabase start` locally. This spins up an exact clone of Supabase (PostgreSQL, Auth, Storage, and Realtime) inside local Docker containers on the developer's laptop. It costs $0, uses 0 cloud projects, works offline, and allows destructive testing without touching live data.
  * **Database Migrations:** Schema changes are authored in SQL files (`supabase/migrations/*.sql`). When tested and verified locally, running `supabase db push` applies the migrations to the single production cloud Supabase project.
  * **Data Isolation in Cloud:** If staging/testing is needed directly in the cloud project, testing records use a dedicated testing cafe tenant (`cafe_id = '00000000-0000-0000-0000-000000000000'`). RLS guarantees this test data is 100% invisible to real cafe accounts.

---

## 8. Summary: MVP vs. Production Layer Comparison

| Layer | MVP (Phase 1) | Production (Phase 2 & 3) | Change Type |
| :--- | :--- | :--- | :--- |
| **Database** | Supabase Postgres (3 tables: `cafes`, `categories`, `dishes`) | Same tables + composite indexes (`cafe_id`, `stage`) + targeted Realtime | **Config switch** (SQL index script) |
| **Auth** | Supabase Auth (Single email/password per cafe) | Magic links + Custom SMTP (Resend) + Role metadata (`manager`, `photographer`) | **Config switch** (Dashboard SMTP keys + additive RLS) |
| **Frontend** | React + Vite SPA on Vercel Edge CDN | Same Vite SPA + TanStack Query optimistic updates & offline cache | **Incremental Refactor** (Wrapping fetchers in hooks) |
| **Hosting** | Vercel Free (`*.vercel.app`) | Vercel Free with custom cafe brand domain | **Config switch** (DNS entry) |
| **Server Functions**| None (Direct client-to-DB via RLS) | 1 Supabase Edge Function (`parse-menu-upload` for bulk CSV import) | **Additive feature** (New directory; 0 rewrites) |
| **Asset Storage** | None (Text/status only) | Supabase Storage (`dish-thumbnails`) with client-side 100KB compression | **Additive feature** (New upload component) |

> **Note on Rewrites:** There is **zero structural rewrite** between MVP and Production. Every production upgrade is either a **config switch** (indexes, custom SMTP, custom domain) or an **additive feature** (adding an edge function for bulk CSV, adding an upload component for thumbnails).

---

## 9. The Decision Most Expensive to Reverse

The single choice that would hurt most to undo in six months is:

### **The Decision: Normalized Relational Tables vs. A Single Menu JSON Document**

* **The Choice Made:** Storing dishes as individual rows in a relational `dishes` table with foreign keys to `cafes` and `categories`, rather than storing a cafe's entire menu as a single JSON blob (`menu_data JSONB`) on the `cafes` table.
* **Why it is tempting to make the wrong choice:**
  During early MVP prototyping, developers often store the entire menu as one large JSON object inside a single row because cafes have varying categories, dish notes, and options. It avoids writing database migrations early on.
* **Why reversing it later is catastrophic:**
  1. **Concurrency Overwrite Collisions:** In a cafe, multiple staff members view the board simultaneously. If the menu is a single JSON blob, when the kitchen manager taps Dish A (saving the whole JSON blob) at the exact same second the photographer taps Dish B (saving their copy of the JSON blob), the second write silently overwrites and deletes the first write's update. Fixing this requires ditching the JSON document and rewriting the entire data architecture.
  2. **Row-Level Realtime Locking:** Supabase Realtime streams updates per row. With individual dish rows, tapping a dish broadcasts a tiny payload (1 row updated: `dish_id: 42, stage: 'photo_taken'`), updating only that single card across all connected tablets in 10 milliseconds. With a JSON blob, the entire multi-kilobyte menu must be re-broadcast and re-rendered on every single tap.
  3. **Data Migration Nightmares:** Migrating active production customers from a nested JSON blob into relational tables with audit history, timestamps, and stage logs requires writing complex, error-prone data extraction scripts while the app is live.

By locking in a clean, normalized relational schema (`dishes` table with `cafe_id`, `category_id`, `name`, and `stage`) on Day 1, stage transitions remain atomic, concurrency conflicts are physically impossible, and future requirements (such as independent per-channel checkboxes for Zomato, Swiggy, and Instagram) are trivial single-column additions rather than database rewrites.
