# Implementation Plan: Menu Photo Board (Phase 1 MVP)

This document answers one question: **in what order, and what is demonstrable at each step?**

> **THE OVERRIDING ORDERING RULE:**  
> **Every single step ends in something you can open on a phone and look at.**  
> Not "the database was migrated" or "the API route was configured". If a step cannot be opened and inspected on a physical device, it does not stand alone as a step.

---

## 1. Sequence of Steps

### Step 1: Mobile-First Single Screen Shell & Visual Baseline
* **What gets built:**
  * Initialize Vite + React + TypeScript + Tailwind CSS project in the workspace.
  * Construct the complete single-screen layout strictly optimized for a 375 px mobile phone viewport and tablet counter view.
  * Build the header bar, the headline deficit counter banner (`"14 dishes with No Photo"`), category filter pills, and sample dish cards displayed across all 4 stages (*No Photo*, *Photo Taken*, *Photo Edited*, *Live*) using hardcoded mock data.
  * Deploy static bundle to live Vercel preview URL.
* **What you can see on a phone at the end of it:**
  * Open the live URL on your mobile phone. You see the complete Menu Photo Board interface: a high-contrast deficit counter at the top, category pills, and 8 realistic dish cards rendered with stage badges and 44 px tap targets.
* **Verification:**
  * Open page in Chrome DevTools Device Mode set to 375 px width and on a physical mobile phone.
  * Verify zero horizontal scrolling.
  * Verify tap targets are at least 44 px tall.
  * Check color contrast ratios on deficit banner and stage badges (must exceed WCAG AA 4.5:1).
* **Agent Time Estimate:** 20 minutes.

---

### Step 2: Live Database Wiring & Normalized Data Fetch (The Core Model)
* **What gets built:**
  * Initialize Supabase client inside the frontend application.
  * Apply local database migrations creating the normalized relational tables: `cafes`, `categories`, and `dishes` (with `cafe_id`, `category_id`, `name`, and `stage`).
  * Seed the database with a realistic 15-dish cafe menu.
  * Replace the static mock data from Step 1 with a live asynchronous query fetching directly from the database.
* **What you can see on a phone at the end of it:**
  * Open the URL on your phone. The dishes you see are now loading live from PostgreSQL.
  * If you change a dish name in the database table, refreshing the phone screen displays the updated name immediately.
* **Verification:**
  * Run an update command changing `"Classic Cold Brew"` to `"Signature Nitro Brew"` in the database.
  * Refresh the phone screen; verify the text updates.
  * Inspect the browser network tab to confirm the data arrives as normalized relational objects rather than a single nested JSON document.
* **Agent Time Estimate:** 25 minutes.

---

### Step 3: Single-Tap Stage Advancement & Tap Correction (Undo)
* **What gets built:**
  * Implement single-touch tap interaction on dish cards to advance to the next sequential stage:  
    `no_photo` -> `photo_taken` -> `photo_edited` -> `live`.
  * Implement an immediate undo button/icon on each card to revert the dish back by one stage.
  * Implement Optimistic UI updates: tapping updates the card's visual state instantly (0 ms), while dispatching an asynchronous `UPDATE dishes SET stage = ... WHERE id = ...` in the background. If the request fails, it rolls back gracefully.
* **What you can see on a phone at the end of it:**
  * Tap a dish card with your finger on your phone. Its badge color and stage label change instantly before your eyes.
  * Tap the undo button on the card. It immediately steps back to the previous stage.
  * Refresh the phone page; the dish stays in its newly updated stage (proving database persistence).
* **Verification:**
  * Tap 3 different dishes on the phone screen.
  * Close the phone browser tab and reopen it.
  * Confirm all 3 dishes remain in their advanced stages.
  * Tap undo on one dish, reload, and confirm it persisted in the reverted stage.
* **Agent Time Estimate:** 25 minutes.

---

### Step 4: Reactive Top Deficit Counter
* **What gets built:**
  * Connect the headline deficit banner at the top of the screen to a real-time computed aggregation:
    * Count of active dishes with `stage = 'no_photo'`.
    * Total active dish count.
    * Percentage of menu with photos.
  * Dynamically recalculate these metrics whenever any dish card is tapped forward or reverted.
* **What you can see on a phone at the end of it:**
  * At the top of your phone screen, you see: `"12 dishes with No Photo (60% complete)"`.
  * Tap a dish from "No Photo" to "Photo Taken"; the counter in the top banner immediately decrements to `"11 dishes with No Photo (63% complete)"`.
  * Tap undo; the counter immediately increments back to 12.
* **Verification:**
  * Advance all "No Photo" dishes in a test category; verify the top banner transitions from an amber warning state to a green success banner showing `"0 dishes missing photos (100% complete)"`.
  * Revert one dish; confirm the counter immediately reflects 1 missing photo.
* **Agent Time Estimate:** 15 minutes.

---

### Step 5: Cross-Device Realtime Synchronization
* **What gets built:**
  * Enable Supabase Realtime replication on the `dishes` table.
  * Wire a WebSocket subscription inside the React app (`supabase.channel('dishes-sync')`) listening to row-level `UPDATE`, `INSERT`, and `DELETE` events.
* **What you can see on a phone at the end of it:**
  * Open the app on your phone in your hand. Open the same URL on your laptop screen.
  * Tap a dish on the laptop. Without touching your phone, watch the dish card on your phone jump to the next stage and watch the top counter decrement simultaneously within 300 ms.
* **Verification:**
  * Keep phone and laptop screens visible side by side.
  * Perform 4 rapid taps on different dishes on the laptop.
  * Confirm all 4 changes appear on the phone screen without manual refresh.
  * Confirm zero console WebSocket reconnection errors.
* **Agent Time Estimate:** 20 minutes.

---

### Step 6: Category Filtering & Focused View
* **What gets built:**
  * Category pill filter bar: "All", plus dynamic categories queried from the database (e.g. "Coffee", "Bakery", "Mains").
  * Stage quick-filter toggle: "All Stages", "Needs Photo" (`no_photo`), "In Progress" (`photo_taken` / `photo_edited`), "Live".
* **What you can see on a phone at the end of it:**
  * Tap the "Needs Photo" pill on your phone. The screen instantly filters out all completed dishes, showing the photographer an actionable punch-list of only the items that still require a camera.
  * Tap "Coffee"; only coffee items appear.
* **Verification:**
  * Tap each category pill on the phone; verify matching items render and non-matching items are hidden.
  * Tap "Needs Photo"; advance an item; verify it immediately vanishes from the "Needs Photo" view.
* **Agent Time Estimate:** 15 minutes.

---

### Step 7: In-App Dish Management (Add, Rename, Archive)
* **What gets built:**
  * A compact mobile bottom slide-over modal to:
    1. Add a new dish name and assign it to a category.
    2. Edit/rename an existing dish.
    3. Archive/delete a seasonal or discontinued dish.
  * Immediate database `INSERT` / `UPDATE` mutations with optimistic list insertion.
* **What you can see on a phone at the end of it:**
  * Tap the floating `+ Add Dish` button on your phone.
  * Type `"Pistachio Croissant"`, select `"Bakery"`, and tap Save.
  * It instantly appears on the board under "No Photo", and the top deficit counter increments by +1.
* **Verification:**
  * Add a test dish from the phone; verify it appears in the list and top counter increments.
  * Archive the test dish; verify it disappears from the screen and the top counter decrements.
  * Verify submitting an empty name string is refused with a clear validation error message.
* **Agent Time Estimate:** 25 minutes.

---

### Step 8: Multi-Tenant Authentication & Counter Lock-In
* **What gets built:**
  * Branded sign-in screen (Email + Password) with persistent session storage.
  * PostgreSQL Row Level Security (RLS) policies enforcing multi-tenant isolation:
    * `cafe_id = auth.uid()` on all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` queries on `categories` and `dishes`.
* **What you can see on a phone at the end of it:**
  * Open the app; see a clean login screen. Enter cafe credentials once.
  * You are taken into your cafe's private photo board.
  * Logging in with a second cafe's credentials reveals a completely separate menu board.
* **Verification:**
  * Seed two distinct cafes: Cafe Alpha and Cafe Beta.
  * Log in as Cafe Alpha on phone; log in as Cafe Beta on laptop.
  * Advance a dish on Cafe Alpha; verify Cafe Beta's screen does not change.
  * Confirm that direct database queries attempted across tenant boundaries return 0 rows.
* **Agent Time Estimate:** 25 minutes.

---

## 2. Summary Timeline & Estimates

| Step | What is Built | What You See on a Phone | Est. (Min) |
| :--- | :--- | :--- | :--- |
| **1** | Mobile-First Shell & Visual Baseline | Full board layout with mock cards & deficit banner on live URL | 20 |
| **2** | Live DB Wiring & Normalized Model | Real menu items fetched live from PostgreSQL | 25 |
| **3** | Single-Tap Advance & Undo | Tap dish with finger to advance stage; tap undo to step back | 25 |
| **4** | Reactive Top Deficit Counter | Top missing count decrements live as dishes are tapped | 15 |
| **5** | Cross-Device Realtime Sync | Tap on laptop; watch phone screen update via WebSocket | 20 |
| **6** | Category & Stage Filtering | Tap pills to isolate "Needs Photo" or specific menu sections | 15 |
| **7** | In-App Dish Management | Add, rename, or archive dishes via mobile slide-over | 25 |
| **8** | Tenant Auth & Counter Lock-In | Persistent login per cafe; strict database RLS isolation | 25 |
| **Total** | **Full Phase 1 MVP** | **Production-ready operational board** | **170 min (~2.8 hrs)** |

---

## 3. Decisions Most Expensive to Reverse (And Where They Occur)

To ensure mistakes are caught when they are cheapest to fix, the high-consequence architectural decisions are locked early in the sequence:

1. **Normalized Relational Schema vs. JSON Blob:**
   * *Where it occurs:* **Step 2.**
   * *Why it is early:* Catching this at Step 2 costs 0 rewritten code because no business logic has been written yet. If caught at Step 7 after building filters and mutations, unwinding a JSON blob requires discarding and rewriting the entire data layer.
2. **Single-Screen Density & Layout Architecture:**
   * *Where it occurs:* **Step 1.**
   * *Why it is early:* Verifying on a physical 375 px phone screen that 100 dishes can be navigated without cognitive overload is confirmed before writing a single database line.
3. **Optimistic Direct DB Mutation vs. Heavy Backend Server:**
   * *Where it occurs:* **Step 3.**
   * *Why it is early:* Establishes that client-side optimistic mutations over Supabase RLS fulfill the sub-2-second speed constraint without standing up an Express/Node server.
4. **WebSocket Realtime vs. Periodic Polling:**
   * *Where it occurs:* **Step 5.**
   * *Why it is early:* Proves cross-device live synchronization works natively over Supabase CDC before adding the management forms in Step 7.

---

## 4. Exit Criteria (The Whole-Phase Checklist)

You can mark Phase 1 MVP complete only when every single item below passes on a real phone:

- [ ] **Physical Phone Usability:** The app loads on a 375 px mobile phone with zero horizontal scroll, tap targets $\ge 44$ px, and contrast ratios passing WCAG AA.
- [ ] **Accurate Real-Time Deficit Metric:** The top headline counter accurately displays the exact number and percentage of dishes missing photos, updating instantly upon stage transition.
- [ ] **Reliable 4-Stage Progression:** Tapping a dish advances it sequentially (*No Photo* -> *Photo Taken* -> *Photo Edited* -> *Live*), and the change persists upon page reload.
- [ ] **Accidental Tap Reversal:** An undo control allows stepping a dish backward by one stage immediately.
- [ ] **Sub-2-Second Speed:** A dish stage transition renders on screen in under 100 milliseconds (optimistic update) and synchronizes to the database in under 1 second.
- [ ] **Multi-Screen Sync:** An update made on one device appears on another connected device within 1 second without page refresh.
- [ ] **Menu Mutability:** Cafe staff can add a new dish name and archive a discontinued dish directly from the interface.
- [ ] **Tenant Isolation:** Cafe A credentials cannot view, edit, or receive Realtime events for Cafe B's dishes.

---

## 5. What We Drop If We Run Short of Time Tonight

If time constraints force scope reduction during build execution tonight, here is the explicit triage order. Items at the top are dropped first; the core operational loop is protected at all costs:

1. **First to drop: Cross-Device Realtime WebSockets (Step 5)**
   * *Fallback:* Drop the live WebSocket listener and rely on standard page load fetching plus an unobtrusive "Refresh Board" button (or 30-second interval poll). A counter tablet still functions 100% fine on its own.
   * *Time saved:* ~20 minutes.
2. **Second to drop: In-App Dish Creation/Editing UI (Step 7)**
   * *Fallback:* Seed the cafe's menu directly via Supabase Table Editor or a seed SQL script for tonight's demo. Staff use the board strictly to advance and track existing dishes.
   * *Time saved:* ~25 minutes.
3. **Third to drop: Category Filter Pills (Step 6)**
   * *Fallback:* Render the menu as a single grouped vertical list. The photographer scrolls down the list rather than tapping filter tabs.
   * *Time saved:* ~15 minutes.

### What is NON-NEGOTIABLE (Never Dropped):
* **The Single-Screen Mobile Board (Step 1 & 2):** If you cannot see your dishes on the phone, you have no app.
* **Single-Tap Stage Advancement & Undo (Step 3):** The primary interaction mechanic.
* **The Headline Deficit Counter (Step 4):** The business value proposition of the product.
* **Tenant Isolation / Basic Auth (Step 8):** Data security and multi-cafe separation cannot be compromised.
