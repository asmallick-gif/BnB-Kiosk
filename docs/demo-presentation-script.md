# Bake'n Brew Kiosk and Staff Portal: recorded demonstration script

Target duration: 20 to 25 minutes (roughly 2,600 spoken words at 130 to 135 words per minute, plus 3 to 4 minutes of live UI clicks and terminal runs).
Tone: Formal and structured, while speaking directly to viewers in a warm, honest voice.
Repository: `https://github.com/asmallick-gif/BnB-Kiosk`

## Pre-recording checklist

1. Open the repository in VS Code with `.vscode/extensions.json`, `src/services/orders.ts`, `src/services/staffOrders.ts`, `src/stores/staffOrders.ts`, `vite.config.ts`, `README.md`, and `docs/supabase-staff-schema.sql` open in tabs.
2. Run `npm run dev` in a clean terminal (or run both `npm run dev` and `npm run dev:staff` if `.env.local` is configured with Supabase credentials).
3. Open Chrome with two side-by-side windows: Kiosk at `http://localhost:5173/` and Staff Portal at `http://localhost:5173/staff/login` (or `http://localhost:5174/login` with Supabase). Open Chrome DevTools on the Network tab filtered by Fetch/XHR.
4. Open `https://github.com/asmallick-gif/BnB-Kiosk` in another tab with at least one GitHub Issue and an open Pull Request for `feat/add-menu-items` ready to show.
5. Clear `localStorage` and `sessionStorage` on `localhost:5173` so the order queue starts empty.

## Pacing overview

| Time | Section | Focus |
| --- | --- | --- |
| 00:00 - 02:30 | 1. Problem, target users, and requirements | Everyday cafe bottlenecks, user groups, and scope |
| 02:30 - 08:00 | 2. Live application demonstration | Customer order, payment gate, QR tracking, availability, records, and account |
| 08:00 - 10:30 | 3. External API request and response data | Supabase RPC payloads, server-side totals, and realtime updates |
| 10:30 - 12:30 | 4. Selected VS Code extensions | Volar, Vitest Explorer, ESLint/Oxc, Prettier/EditorConfig, Playwright |
| 12:30 - 15:00 | 5. Git commits, branches, Issues, and Pull Requests | Commit log, `feat/add-menu-items`, GitHub Issues, and PR diff |
| 15:00 - 17:30 | 6. Selected design pattern in source code | Adapter Pattern in `src/services/`, Pinia store decoupling, and state machine |
| 17:30 - 19:30 | 7. Documentation and project setup | Project docs, `.env.example`, SQL schema, and clean installation steps |
| 19:30 - 21:30 | 8. Executing tests and explaining results | Live Vitest run of `orders.spec.ts` and full 39-test suite |
| 21:30 - 23:30 | 9. Challenges, limitations, and future improvements | Engineering trade-offs, current gaps, and next steps |

## Section 1: Problem, target users, and project requirements (00:00 - 02:30)

[SCREEN: Bake'n Brew Kiosk welcome screen at `http://localhost:5173/`]

Good day, everyone, and thank you for joining me for this walkthrough of our project, the Bake'n Brew Kiosk and Staff Portal. Whether you are grading this system or simply curious about how we built a dual-interface web application, I want to walk you through it plainly, showing what works well and where we still see room to improve.

Picture a busy afternoon at a cafe like Bake'n Brew. A line builds up at the counter because customers need time to browse drinks, ask prices, and decide between dine-in and take-out. Once they pay, they crowd the pickup bar wondering whether their order is queued, cooking, or ready. Behind the counter, staff deal with their own friction: marking an item sold out mid-shift happens verbally, and pulling daily sales totals means sorting through slips by hand.

We built this system for two groups of users.

First are walk-in cafe customers. They need a clear counter kiosk to browse the menu, place a dine-in or take-out order, and then step away to a table while tracking order progress on their own phone.

Second are cafe staff: cashiers, baristas, kitchen crew, and managers. They need a clean back-of-house workspace to verify payments before cooking begins, move orders through the queue, toggle menu availability, review daily sales, and update their own accounts.

From those needs, we set our functional requirements:
- A self-service customer kiosk covering 13 menu categories and 57 items, with cart controls, dine-in or take-out selection, and cash or e-wallet choice.
- A cashier payment gate. Every submitted order starts as `pending` and stays out of the cooking queue until staff confirm payment.
- Live phone tracking through a generated QR code pointing to `/order/<token>`.
- A staff portal with four operational views: Order Queue, Menu Availability, Order Records with CSV export, and My Account.
- Controlled employee registration gated by admin-issued invitation codes.

We also set three technical requirements:
- Build two isolated production apps (`dist/` for the kiosk and `dist-staff/` for staff) from one shared codebase so zero staff code ships to the public kiosk.
- Protect every database operation with parameterized Supabase RPCs, Row Level Security, and client-side allowlists so a browser cannot alter prices or self-approve orders.
- Keep local development self-contained so another developer can run and test the entire flow before wiring up a live Supabase project.

## Section 2: Launching the application and demonstrating main features (02:30 - 08:00)

[SCREEN: VS Code terminal showing `npm run dev`]

To start locally, we run `npm run dev` on port `5173`. When connected to Supabase, we also run `npm run dev:staff` in a second terminal so the staff portal runs on its own origin at port `5174`. For offline preview without external credentials, dev mode mounts the staff portal at `/staff/login` on port `5173` so both windows share browser storage and we can demonstrate the full handoff end to end.

[SCREEN: Kiosk window at `http://localhost:5173/`]
[ACTION: Click "Dine-in", browse categories, add Spanish Latte and Biscoff Matcha, open "View my order", click "Proceed to Checkout"]

Here is the customer kiosk welcome screen. I will choose "Dine-in" to start an order. On the menu screen, customers can browse all 13 categories, including Best Sellers, Starter, Rice Meals, Pasta, Noodles, Chicken Wings, Burgers, Hot Coffee, Iced Coffee, Hojicha, Baker's Coffee Menu, Non-Coffee, and Matcha Series. Let us add a Spanish Latte and a Biscoff Matcha, then open the order summary and proceed to checkout.

[ACTION: Select "E-wallet" or "Cash", click "Confirm Order", wait 2 seconds, then press F5 to reload]

On checkout, the customer reviews quantities and selects Cash or E-wallet. Selecting E-wallet simply tells the cashier how the customer intends to pay at the counter, such as GCash or Maya; it never marks the order paid by itself.

When I click "Confirm Order", the kiosk moves to "Waiting for confirmation/payment". There is no QR code yet and no button for the customer to bypass approval. Watch what happens if I reload the page right now: it stays on the exact same pending order without creating a duplicate.

[SCREEN: Staff Portal window at `http://localhost:5173/staff/login` or `http://localhost:5174/login`]
[ACTION: Briefly show the Register link and invitation code field, then sign in and open the Order Queue]

Now let us step behind the counter. On Staff Login, employees sign in with their work email and password. New employees register using an admin-issued invitation code, such as our seeded initial code `BNB-5JSN-SYN3`.

Once signed in, we land on the Order Queue (`StaffQueueView.vue`). Our new order sits in the Waiting column with its queue number, order type, payment method, and items. Before cooking can begin, clicking the action opens a Proceed or Cancel payment prompt so the cashier verifies the cash or e-wallet receipt first.

[ACTION: Confirm payment (`pending` to `confirmed`), then advance to `cooking`]
[SCREEN: Switch to or show side-by-side Kiosk window]

As soon as payment is confirmed, the customer kiosk updates automatically. It switches to the large Queue Number and generates a scannable QR code using the `qrcode` library.

[ACTION: Open `/order/<token>` in a new tab to simulate a phone, click "Done" on the kiosk, then advance the order to `ready` and `completed` in Staff Queue]

In the cafe, the customer scans this QR code on their phone to open `/order/<token>`, where they see "Order confirmed" and then "Your order is cooking" in real time. Tapping "Done" on the kiosk clears only the kiosk's session storage and returns to the welcome screen for the next customer, while the phone tracking link stays active until completion.

[ACTION: Click through Available, Records, and My Account in the staff sidebar]

Before we inspect the network layer, here are the other three staff pages:
- Available (`StaffAvailabilityView.vue`) lets staff search all 57 items, filter by availability, and adjust stock counts. Setting a count to zero automatically marks the item unavailable.
- Records (`StaffRecordsView.vue`) summarizes completed orders by Today, Week, Month, or All Time, calculating items served, total sales in Philippine pesos, and the top-selling item, with column sorting and CSV export.
- My Account (`StaffAccountView.vue`) lets each staff member update their profile details, upload an avatar image, and change their password directly.

## Section 3: External API request and resulting data (08:00 - 10:30)

[SCREEN: Chrome DevTools Network tab (Fetch/XHR filter) alongside `src/lib/supabase.ts` and `src/services/orders.ts`]

Now let us look at how the application talks to its external API. We use Supabase for hosted PostgreSQL, authentication, PostgREST RPC endpoints, and Realtime WebSocket subscriptions.

In `src/lib/supabase.ts`, we initialize the client from two environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. When those keys are set in `.env.local`, submitting an order calls `supabase.rpc('create_kiosk_order', { p_request: request })`, which sends an HTTPS `POST` request to `/rest/v1/rpc/create_kiosk_order`.

[ACTION: If connected to live Supabase, inspect the `POST /rest/v1/rpc/create_kiosk_order` entry in DevTools Network tab; if running offline preview, show `src/services/orders.ts` lines 53-58 and `docs/kiosk-order-integration.md` lines 29-65]

Here is the request payload our kiosk sends:

```json
{
  "p_request": {
    "requestId": "9f2a4c10-7b1e-4b78-9d2d-3a6e0b44e1a2",
    "orderType": "Dine-in",
    "paymentMethod": "cash",
    "items": [
      { "id": "best-sellers-1", "quantity": 1 }
    ]
  }
}
```

Notice what we leave out on purpose: there are no prices, no totals, and no status field. A public kiosk browser should never dictate what an order costs. Inside PostgreSQL, `create_kiosk_order` validates every item ID against `public.products`, checks stock availability, computes totals on the server, and inserts a `pending` row. Because `requestId` is unique, a retry over spotty Wi-Fi returns the existing order instead of creating a duplicate.

Here is the JSON response returned with HTTP `200 OK`:

```json
{
  "token": "c41d0f82-51e7-4a9b-8f13-6e2b7a913d05",
  "requestId": "9f2a4c10-7b1e-4b78-9d2d-3a6e0b44e1a2",
  "queueNumber": 8,
  "orderType": "Dine-in",
  "paymentMethod": "cash",
  "items": [
    {
      "id": "best-sellers-1",
      "name": "Spanish Latte",
      "quantity": 1,
      "lineTotal": 180
    }
  ],
  "subtotal": 180,
  "discount": 0,
  "total": 180,
  "status": "pending",
  "createdAt": "2026-11-24T02:30:00Z"
}
```

From there, `OrderStatusView.vue` polls `POST /rest/v1/rpc/get_kiosk_order` with `{ "p_token": "<uuid>" }` every 2.5 seconds. That endpoint returns only that single order's public receipt and status. On the staff side, authenticated requests call `staff_list_orders`, `staff_update_order_status`, and `staff_update_product_availability`, while Supabase Realtime pushes `postgres_changes` events whenever `public.orders` or `public.products` changes.

## Section 4: Demonstrating selected VS Code extensions (10:30 - 12:30)

[SCREEN: VS Code with `.vscode/extensions.json` open]

To keep everyone's editor behaving the same way, we checked our workspace extension list into `.vscode/extensions.json`. When someone opens this repository in VS Code, it prompts them to install these tools automatically. Let me show four of them in action.

[ACTION: Open `src/views/OrderStatusView.vue` and hover over `order` or `confirmed` in the template]

First is `Vue.volar`, the official Vue extension. Standard TypeScript does not inspect `.vue` templates on its own. With Volar installed, hovering over `order` or `confirmed` inside `<template>` shows full inferred types and catches mistyped bindings immediately, matching what `vue-tsc` checks in our build script.

[ACTION: Open the VS Code Testing sidebar (`vitest.explorer`) and run one test case inline]

Second is `vitest.explorer`. From the Testing sidebar here, I can run a single test file or an individual `it()` block right next to the code and see green checkmarks directly in the editor gutter without switching to a terminal.

[ACTION: Open `src/services/orders.ts`, type `const unusedCheck = 1` briefly to trigger the diagnostic squiggle from ESLint/Oxc, then undo it]

Third, we pair `dbaeumer.vscode-eslint` with `oxc.oxc-vscode`. Oxc flags unused variables and common logic mistakes almost instantly, while ESLint enforces our Vue, TypeScript, Vitest, and Playwright rules as we type. Watch the diagnostic appear as soon as I add an unused constant, and disappear when I undo it.

[ACTION: Show `.prettierrc.json` or save a file to show formatting via `esbenp.prettier-vscode` and `EditorConfig.EditorConfig`]

Fourth, `esbenp.prettier-vscode` and `EditorConfig.EditorConfig` enforce consistent two-space indentation, single quotes, and line endings on save, which keeps Git diffs focused on real logic changes. We also include `ms-playwright.playwright` so teammates can run or step through `e2e/order-confirmation.spec.ts` right from VS Code.

## Section 5: Git commits, branches, Issues, and Pull Requests (12:30 - 15:00)

[SCREEN: VS Code terminal running `git log --oneline -n 15` and `git branch -a`]

Next, let us look at our Git history and collaboration workflow.

[ACTION: Run `git log --oneline -n 15` and `git branch -a`]

Reading `git log --oneline` from bottom to top traces how the application came together in small, reviewable increments:
- Importing the initial Figma ordering layouts (`5dc0fb3`) and building out the first six menu categories commit by commit (`ea17ce2` through `dfb7a28`).
- Implementing kiosk checkout, pending payment confirmation, and QR tracking (`8c0bf8f`).
- Adding the standalone staff portal (`69842c0`), the Staff Order Queue with invitation codes and SQL injection protection (`282d59a`), Menu Availability (`56480d1`), Order Records with CSV export (`d8f3f7d`), and My Account (`e6d9a76`).
- And most recently on our feature branch `feat/add-menu-items`, commit `84f341a` adds 7 new menu categories, 30 local product images, updated SQL seed rows, and catalog integrity tests.

Running `git branch -a` shows `main` staying stable while new features develop on isolated branches pushed to `origin`.

[SCREEN: Chrome showing `https://github.com/asmallick-gif/BnB-Kiosk` Issues tab, then Pull Requests tab]
[ACTION: Open a GitHub Issue, then switch to the Pull Request for `feat/add-menu-items` and click "Files changed"]

On GitHub, we track scoped work and bugs using our repository templates in `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md`, backed by our engineering issue ledger in `docs/known-issues.md` and release history in `CHANGELOG.md`. Every issue starts with clear acceptance criteria, whether it is adding menu categories or reconciling a price difference between Best Sellers and a category list. When the branch is tested and ready, we open a Pull Request into `main`. On the Files Changed tab, a reviewer can inspect the exact diff across `src/data/menu.ts`, `docs/supabase-staff-schema.sql`, `src/data/__tests__/menu.spec.ts`, and `public/menu/`, confirm all checks pass, and merge cleanly.

## Section 6: Explaining the selected design pattern using source code (15:00 - 17:30)

[SCREEN: VS Code with `src/services/orders.ts`, `src/services/staffOrders.ts`, and `src/stores/staffOrders.ts` open]

The primary design pattern we applied across our data layer is the Adapter Pattern, backed by a Pinia Store layer and a small State Machine for order transitions.

We needed every Vue view and Pinia store to run against two completely different backends: Supabase RPCs and Realtime channels in production, and browser `localStorage` with `storage` events during offline local development and automated tests. Mixing `if (supabase)` conditionals inside Vue components would have made the UI hard to maintain, so we isolated that translation behind `src/services/`.

[ACTION: Highlight `submitOrder` and `getOrder` in `src/services/orders.ts` lines 53-124]

In `src/services/orders.ts`, callers only ever invoke `submitOrder(request)` and `getOrder(token)` using the shared `KioskOrder` type:
- When `supabase` is configured, `submitOrder` calls `supabase.rpc('create_kiosk_order', ...)` and validates the result with `parseOrder`.
- When `supabase` is null and `import.meta.env.DEV` is true (`isLocalOrderDemo`), it adapts the same operation to `localStorage`, using `navigator.locks` to prevent race conditions while keeping identical price calculation and idempotency checks.
- In a production build without Supabase, line 59 refuses to fall back and throws an explicit unavailability error.

[ACTION: Highlight `allowedTransitions` (lines 15-26) and `subscribeStaffOrders` (lines 118-144) in `src/services/staffOrders.ts`]

Look at `src/services/staffOrders.ts`. `subscribeStaffOrders(onChange)` adapts real-time notifications the same way: Supabase attaches a `postgres_changes` channel while local dev attaches a `window.addEventListener('storage', ...)` listener, and both return a plain `() => void` cleanup function.

Right above that on lines 15 to 22, `allowedTransitions` implements a small State Machine: `pending` can move only to `confirmed` or `rejected`, `confirmed` to `cooking`, `cooking` to `ready`, and `ready` to `completed`. The database enforces the exact same map so no client can skip payment verification.

[ACTION: Show `src/stores/staffOrders.ts` lines 1-89]

Look at the result in `src/stores/staffOrders.ts`. There is zero mention of `supabase` or `localStorage` anywhere in this store. `useStaffOrdersStore` calls the service functions, computes reactive queues (`waitingOrders`, `cookingOrders`, `readyOrders`), and reference-counts watchers inside `startWatching()` so multiple staff pages share one subscription cleanly.

We also use a Factory function in `src/router/staffRoutes.ts` (`createStaffRoutes(prefix)`) together with `appTargetPlugin` in `vite.config.ts` so the same routes mount at `/staff/*` in local dev and at `/` in the standalone `dist-staff/` build.

## Section 7: Documentation and how another person can install and run the project (17:30 - 19:30)

[SCREEN: VS Code showing `README.md`, `docs/kiosk-order-integration.md`, `docs/staff-backend-setup.md`, and `.env.example`]

To make onboarding straightforward for another developer, we organized the documentation into four files:
- `README.md` covers IDE setup, npm scripts, testing commands, and linting.
- `docs/kiosk-order-integration.md` specifies the order lifecycle, both public Supabase RPC contracts, JSON shapes, and QR URL requirements.
- `docs/staff-backend-setup.md` documents the two-port dev workflow, dual-site production deployments (`dist/` and `dist-staff/`), Supabase setup, and security controls.
- `docs/supabase-staff-schema.sql` provides a single idempotent PostgreSQL script that creates tables, RLS policies, RPC functions, the initial hashed invitation code, and all 57 menu product seed rows.

Here is how another person installs and runs the project from scratch:

```sh
node -v # Requires Node ^22.18.0 or >=24.12.0
git clone https://github.com/asmallick-gif/BnB-Kiosk.git
cd BnB-Kiosk
npm install
npm run dev
```

With just those five commands, anyone can open `http://localhost:5173/` for the kiosk and `http://localhost:5173/staff/login` for the staff portal in local preview mode. To connect a real Supabase backend, they copy `.env.example` to `.env.local`, fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, execute `docs/supabase-staff-schema.sql` in the Supabase SQL Editor, and run `npm run dev` alongside `npm run dev:staff`.

## Section 8: Executing tests and explaining the results (19:30 - 21:30)

[SCREEN: VS Code terminal]
[ACTION: Run `npx vitest run src/services/__tests__/orders.spec.ts`]

Let us run our automated tests now and look closely at what they prove. First, I will run the kiosk order lifecycle suite:

```sh
npx vitest run src/services/__tests__/orders.spec.ts
```

[PAUSE: Show the Vitest terminal output with all 10 tests passing]

Every case in `orders.spec.ts` passed, and each one protects a concrete business rule:
- The first test sends the same `requestId` twice. It verifies that the order starts as `pending`, computes the price from the catalog (`2 x 180 = 360` for two Spanish Lattes), returns the same `token` on retry, and writes only one order to storage.
- The `it.each` block tests `isOrderConfirmed` across all six statuses, confirming that QR tracking activates only for `confirmed`, `cooking`, `ready`, and `completed`, never for `pending` or `rejected`.
- The invalid quantity tests pass `0`, `-1`, `0.5`, and `100` and verify each throws an error without saving anything.
- The last test queries a random unknown UUID token and confirms `getOrder` throws a "could not be found" error instead of creating a placeholder order.

[ACTION: Run `npm run test:unit -- --run` to display all 15 test files and 39 tests passing]

Running the full suite with `npm run test:unit -- --run` executes all 15 test files and 39 tests in seconds. That includes `src/data/__tests__/menu.spec.ts`, which verifies that all 57 menu items have unique valid IDs, positive prices, real non-empty PNG files in `public/menu/`, and matching seed rows in `docs/supabase-staff-schema.sql`. For browser-level coverage, `e2e/order-confirmation.spec.ts` uses Playwright to test reload persistence, cross-tab staff confirmation, QR rendering, and mobile layout at 375 pixels wide.

## Section 9: Challenges, limitations, and future improvements (21:30 - 23:30)

[SCREEN: Kiosk and Staff Portal split view or VS Code]

To wrap up, I want to be upfront about the challenges we faced, the current limitations of this build, and what we plan to improve next.

Our main technical challenges were:
- Producing two separate production bundles (`dist/` and `dist-staff/`) from one codebase while keeping same-origin local preview working. Writing `appTargetPlugin` in `vite.config.ts` solved that, while keeping `vite.config.ts` as a plain config object so `vitest.config.ts` could merge it cleanly.
- Enforcing backend security without maintaining a separate Node server. All sensitive checks, including SHA-256 invitation hashing, server-side pricing, and order status transitions, live inside locked-down PostgreSQL `SECURITY DEFINER` functions with Row Level Security, backed by client-side allowlists in `src/lib/security.ts`.
- Keeping the TypeScript menu catalog, 57 product images, and SQL product seeds aligned as new Figma categories came in, which we automated with `menu.spec.ts`.

Our honest current limitations are:
- E-wallet selection at checkout records the customer's payment intent for manual cashier confirmation; it does not yet connect to a live PayMongo, GCash, or Maya payment API.
- Local preview mode depends on same-origin `localStorage`, so scanning the QR code from a real phone requires deploying both apps over HTTPS against the same Supabase project.
- The 30 newly exported menu PNGs in `public/menu/` are full-resolution files around 1.7 to 2.1 MB each, which should be compressed for faster loading on cafe Wi-Fi.
- Two items currently differ in price between the original Best Sellers list and their dedicated Figma category screens (`Biscoff Matcha` at 180 vs 170 pesos, and `Iced Latte` at 170 vs 190 pesos). We kept the original Best Sellers prices untouched pending confirmation from the cafe owner.
- One pre-existing unused import remains in `src/services/products.ts` (flagged by `oxlint`), and database schema updates are currently run manually in the Supabase SQL Editor instead of through automated Supabase CLI migrations.

For future improvements, our next steps are clear:
- Integrate a payment gateway webhook (such as PayMongo for GCash and Maya) to auto-confirm verified digital payments while keeping manual cashier verification for cash.
- Convert menu images in `public/menu/` to compressed WebP and move staff profile avatars from base64 data URLs to Supabase Storage buckets.
- Add drink and meal customization options (ice level, sweetness, milk alternatives, and add-ons), kitchen sound alerts, and thermal receipt printing.
- Add a GitHub Actions workflow so every Pull Request automatically runs `type-check`, `lint`, Vitest, and Playwright before merging into `main`.

Thank you for spending this time walking through the Bake'n Brew Kiosk and Staff Portal with me. I hope this gave you a clear picture of how the system works and the engineering choices behind it, and I welcome any questions you have.
