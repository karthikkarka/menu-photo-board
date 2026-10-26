# DRAFT — Product Requirements Document: Menu Photo Board

> **READ THESE FIRST:**
> Before reviewing or approving the rest of this document, you must make explicit decisions on the critical forks listed in **Section 2: Check these first**. The build cannot be locked until those decisions are resolved.

---

## 1. What was said, and what it means for the build

The prompt stated:
> *"Menu photo board: One screen lists every dish on the menu with a stage that moves from no photo to photo taken, edited, and live on Zomato, Swiggy and Instagram. The cafe taps a dish to move it along. A count at the top shows how many dishes still have no proper photo"*

Here is the breakdown of what each word implies and what it costs to deliver:

* **"One screen"**
  * *What it means:* The entire operational lifecycle—from menu overview and stage movement to status indicators and deficit counters—must fit within a single unified view. There are no secondary pages, multi-step sub-routes, or detached administration screens.
  * *What it costs:* Strict spatial layout discipline. If a cafe has 120 dishes, squeezing all items, their stage indicators, interactive controls, and top metrics onto a single screen (especially on a counter tablet or phone) without visual chaos requires disciplined information density, collapsible groupings, or quick-filtering.

* **"lists every dish on the menu"**
  * *What it means:* The system must maintain an active registry of all sellable menu items.
  * *What it costs:* An initial population mechanism and ongoing maintenance workflow. Dishes change, seasonal specials rotate, and items are discontinued. The product must accommodate adding, naming, and archiving dishes without expanding into a heavy inventory catalog.

* **"with a stage that moves from no photo to photo taken, edited, and live on Zomato, Swiggy and Instagram"**
  * *What it means:* A sequential, four-step pipeline:
    1. *No Photo*
    2. *Photo Taken*
    3. *Photo Edited*
    4. *Live on Zomato, Swiggy and Instagram*
  * *What it costs:* 
    * First, defining the boundary of "Live": Does moving a dish to "Live" mean the software magically pushes image files directly into third-party merchant delivery dashboards and social channels, or does it mean a human worker confirms: *"I have uploaded this photo to these three destinations"*? Automated publishing across external commercial networks introduces severe external credential, licensing, and compliance overhead.
    * Second, destination bundling: Grouping Zomato, Swiggy, and Instagram into a single stage treats three completely different platforms as a single atomic event. If an image is live on Swiggy on Tuesday, approved by Zomato on Thursday, and posted to Instagram next week, a single stage forces staff to wait until the last platform clears before advancing the dish.

* **"The cafe taps a dish to move it along"**
  * *What it means:* A single-touch interaction designed for high-speed use on a cafe counter.
  * *What it costs:* A physical interaction model suitable for busy floor staff. However, a pure one-way tap with no safeguard means an accidental finger tap permanently corrupts operational data. It implies the absolute necessity of an immediate undo or step-back action [ASSUMPTION 1].

* **"A count at the top shows how many dishes still have no proper photo"**
  * *What it means:* A persistent headline summary widget that calculates the photography deficit in real time.
  * *What it costs:* The metric must dynamically recalculate whenever dishes are added, archived, or transitioned.

* **"proper photo"**
  * *What it means:* Qualitative judgment. A photo is not just any snapshot; it must meet the cafe's standards for commercial presentation.
  * *What it costs:* Clear human guidelines. The system cannot objectively know if a photo looks appetizing; the designation of "proper" relies on human approval before advancing past the initial stage [ASSUMPTION 2].

---

## 2. Check these first

The idea leaves critical structural forks open. You must decide which direction the product takes before any build begins. Do not quietly merge these options.

1. **Tracker vs. Automated Publisher**
   * *Option A (Status Tracker):* The board is strictly an internal operational checklist. Staff photograph items on their own cameras, edit them externally, upload them to Zomato, Swiggy, and Instagram using their existing merchant portals, and tap this board purely to record that each milestone occurred.
   * *Option B (Publishing Engine):* The board itself must accept image files, format them to third-party delivery platform specifications, and transmit them directly to public listings via merchant accounts.
   * *Decision required:* Are we building an operational status board or an automated multi-platform distribution tool?

2. **Destination Coupling**
   * *Option A (All-in-One Milestone):* A single final stage labeled "Live". A dish cannot enter this stage until it is actively visible on Zomato, Swiggy, AND Instagram.
   * *Option B (Independent Destination Checkboxes):* A dish reaches "Edited", followed by three separate toggles (one for Zomato, one for Swiggy, one for Instagram), allowing partial channel completion.
   * *Decision required:* Is channel publication an all-or-nothing milestone or three independent tracking points?

3. **Menu Item Population & Maintenance**
   * *Option A (Direct Manual Entry):* Staff type dish names directly on the screen using a simple "Add Dish" button.
   * *Option B (Bulk File Upload):* Staff upload an existing menu spreadsheet or structured document to initialize the board.
   * *Option C (External Billing System Sync):* The board must continuously mirror menu items from an existing restaurant billing register.
   * *Decision required:* How does the initial list get into the board, and who updates it when menu items change?

4. **Asset Storage vs. Pure Status Record**
   * *Option A (Pure Status Board):* The app holds only dish names, categories, and their current workflow stage. No image files are ever uploaded or stored inside this app.
   * *Option B (Visual Asset Board):* The app stores and displays the actual photo thumbnail once taken/edited, allowing the manager to review the photo directly on the card before marking it live.
   * *Decision required:* Does this tool store actual photograph files, or does it only track stage text?

5. **Reversibility and Movement Rules**
   * *Option A (Strict Forward Only):* Tapping only moves an item forward (Stage 1 -> 2 -> 3 -> 4). Reverting requires manager-level reset.
   * *Option B (Bi-directional Navigation):* Tapping advances; a secondary action (such as holding down, tapping an undo icon, or opening a detail card) allows stepping back if an item was tapped mistakenly or an edit was rejected.
   * *Decision required:* Can regular floor staff reverse a stage transition directly?

6. **Single Outlet vs. Multi-Branch**
   * *Option A (Single Location):* Scoped exclusively to one independent cafe kitchen.
   * *Option B (Multi-Location):* Supports multiple branches with regional menu variations and distinct delivery portal listings.
   * *Decision required:* Is this product strictly for one cafe or a multi-unit franchise?

---

## 3. Who this is for

The actual humans who will interact with this screen, and their direct goals:

* **The Cafe Owner / Marketing Lead**
  * *Who they are:* The business operator who invests in professional photography to drive higher order volumes on delivery apps and social media.
  * *What they are trying to get done:* Wants to glance at the counter screen for 5 seconds in the morning to see the exact photography deficit (e.g., *"14 dishes still have no photos"*), verify that freshly shot dishes are actually being posted rather than sitting forgotten in an editor's folder, and track progress toward a 100% photo-complete menu.

* **The Cafe Manager / Floor Shift Supervisor**
  * *Who they are:* The operational manager working during service prep, lull hours, or food staging sessions.
  * *What they are trying to get done:* Needs a dead-simple, rapid way to mark off items as plates are prepared and photographed during a shoot, without leaving the kitchen or opening a computer.

* **The Freelance Food Photographer / Content Creator**
  * *Who they are:* The creative partner hired to shoot and retouch the dishes.
  * *What they are trying to get done:* Needs an unambiguous, prioritized punch-list of exactly which menu items currently lack photography, which items are awaiting editing, and which shots have already been finalized.

---

## 4. Scope, locked

The following capabilities constitute the agreed product boundary:

* **Single-Screen Master Dashboard:** A dedicated, unified layout displaying the menu inventory and its photography progression without multi-page transitions.
* **Persistent Top Deficit Counter:** A prominent header display showing:
  * Total number of dishes with "No Photo".
  * Total active menu count and current overall completion percentage [ASSUMPTION 3].
* **Four-Stage Workflow Pipeline:** Explicit tracking across four defined states:
  1. *No Photo* (No proper image exists).
  2. *Photo Taken* (Raw photograph captured).
  3. *Photo Edited* (Image retouched, color-corrected, and cropped).
  4. *Live* (Published and active on Zomato, Swiggy, and Instagram).
* **Single-Touch Advancement:** Tapping a dish advances it directly to the immediate next stage in the pipeline.
* **Accidental Tap Correction:** An immediate step-back or undo capability so mis-taps do not permanently distort the menu status [ASSUMPTION 1].
* **Basic Menu Item Management:** An accessible interface to add a new dish name, edit a dish title, and archive/delete seasonal or discontinued items [ASSUMPTION 4].
* **Category Grouping & Stage Filtering:** The ability to filter the single screen to show only items in a specific stage (e.g., *"Show only dishes with No Photo"* for the photographer) or group by cafe menu section (e.g., Beverages, Desserts, Mains) [ASSUMPTION 5].

---

## 5. Not building, and why

This section defines what is explicitly excluded from the product. This protects budget, timeline, and operational clarity.

* **Out of scope: Direct external automated publishing or platform integrations (Zomato, Swiggy, Instagram)**
  * *Why:* Direct delivery platform catalog integrations require enterprise developer agreements, bespoke merchant account authorizations, and ongoing maintenance of private third-party protocols. Social platform automated image posting introduces complex credential security and media formatting constraints. The board is an operational execution tracker; moving an item to "Live" represents human verification that the upload was completed.
* **Out of scope: In-app camera capture, image filters, and graphic editing software**
  * *Why:* Commercial cafe food photography requires professional cameras, external strobe lighting, and dedicated post-production software. Building toy camera filters or cropping utilities inside this board adds significant complexity without meeting the visual quality standards required to drive food delivery sales.
* **Out of scope: Point of Sale (POS) and Kitchen Display System (KDS) integration**
  * *Why:* Integrating with legacy restaurant billing and order-ticketing hardware creates immense dependency overhead. This tool is an operational marketing checklist, not a live billing register.
* **Out of scope: Customer-facing digital menu or table QR-ordering system**
  * *Why:* This product is strictly an internal operational tool for cafe management, kitchen teams, and photographers. It is not an ordering portal for dining guests.
* **Out of scope: Algorithmic or automated image quality assessment**
  * *Why:* Determining whether a food photo is appetizing, accurately plated, and compliant with cafe branding requires human taste and discretion. The system will not attempt to score or judge image aesthetic quality automatically.
* **Out of scope: Multi-brand franchise permission hierarchy**
  * *Why:* Role-based access control with complex corporate tiers, franchisee approval chains, and region-wide overrides is excluded in favor of a lean, shared-screen model tailored for single-location operations.

---

## 6. Phasing

### Phase 1: Operational Core (V1)
* Fully functional single-screen board with responsive layout suitable for counter tablets and desktop displays.
* Real-time top deficit counter showing dishes with no photo and overall completion percentage.
* Four standard stages: *No Photo*, *Photo Taken*, *Photo Edited*, and *Live*.
* Direct tap progression with built-in undo mechanism to prevent tap errors.
* Manual dish entry, renaming, and archiving.
* Filter controls to isolate dishes by current stage or category.
* Strictly text/indicator based tracking (no asset file hosting).

### Phase 2: Visual Review & Independent Channel Verification (V2)
* Optional image thumbnail preview attachment on each dish card so managers can visually inspect the retouched shot before marking it live [ASSUMPTION 6].
* De-coupled destination toggles: Split the "Live" milestone into three independent toggles (Zomato, Swiggy, Instagram) to reflect real-world delivery approval delays.
* Bulk menu import via standard spreadsheet format to eliminate manual typing during initial cafe onboarding.

### Phase 3: Operational Acceleration (V3)
* Direct web link-outs to the cafe's specific merchant management portals for Swiggy Partner and Zomato Restaurant Suite to accelerate manual photo uploads.
* Multi-outlet switcher for restaurant groups operating multiple branch menus.

---

## 7. Success metrics

The product's performance and business impact will be measured by the following concrete operational targets:

* **Deficit Reduction Rate:** A 50% reduction in the "No Photo" dish count within 14 calendar days of rolling out the board to the cafe.
* **Full Menu Photography Coverage:** 100% of active menu items reaching "Live" status within 30 calendar days of onboarding.
* **Stage Velocity (No Stalled Edits):** The average duration a dish remains in "Photo Edited" before reaching "Live" drops to under 48 hours (eliminating the failure pattern where edited photos sit unused on hard drives).
* **Speed of Interaction:** Less than 2 seconds for cafe floor staff to locate a dish on the screen and record a stage advancement.
* **Operational Adoption:** The board is accessed and interacted with during at least 4 distinct working days per week during prep or shift handover.

---

## 8. Open dependencies

Before the build can proceed, the following external items must be provided by the client or cafe stakeholder:

1. **Client Resolution on Section 2 Decisions:** Explicit answers to the 6 architectural decision forks listed in Section 2 (specifically: tracking vs. automated publishing, and coupled vs. independent channel completion).
2. **Current Master Menu Catalog:** The definitive list of all current dishes, existing categories, and known photo statuses to establish the starting baseline dataset.
3. **Cafe "Proper Photo" Standard Definition:** Clear operational guidelines from the cafe owner detailing what constitutes an acceptable photo (e.g., orientation, lighting, background guidelines) so staff have a shared standard for advancing items.
4. **Target Hardware Environment:** Specifications of the primary physical display where this board will be used (e.g., fixed iPad/tablet on the billing counter, manager's handheld mobile device, or kitchen wall-mounted screen).

---

## 9. Documented Assumptions

The following assumptions were made to resolve gaps in the original brief. Each corresponds to an explicit tag in the document above:

* **[ASSUMPTION 1] Accidental tap correction:** Assumed that in a physical cafe kitchen or billing counter environment, touchscreen mis-taps will occur and staff must be able to reverse an accidental tap without administrative escalation.
* **[ASSUMPTION 2] Subjective quality determination:** Assumed that "proper photo" implies qualitative human judgment by the cafe team rather than an automated automated programmatic check.
* **[ASSUMPTION 3] Total menu context in counter:** Assumed that showing the deficit number alone is insufficient for operational motivation; staff and owners need the total active dish count and percentage completion alongside the missing count.
* **[ASSUMPTION 4] Menu mutability:** Assumed that cafe menus are dynamic and require in-app controls to add, rename, or archive dishes without requiring engineering intervention.
* **[ASSUMPTION 5] Category and stage filtering:** Assumed that viewing 50 to 150 dishes on a single screen during a live photo shoot requires filtering by category or stage so the photographer can focus solely on items needing photography.
* **[ASSUMPTION 6] Visual verification preference in Phase 2:** Assumed that while Phase 1 operates purely on dish names and statuses, managers will eventually want to see a thumbnail preview of the photo before confirming it as "Live".
