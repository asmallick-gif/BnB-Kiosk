# BnB-Kiosk Software Requirements Specification

Bake'n Brew customer kiosk and staff portal  
Repository version: `0.0.0` (draft) · Reviewed: 2026

## Contents

- [1. Introduction](#1-introduction)
- [2. General description](#2-general-description)
- [3. Functional requirements](#3-functional-requirements)
- [4. User interface requirements](#4-user-interface-requirements)
- [5. Performance requirements](#5-performance-requirements)
- [6. Non-functional attributes](#6-non-functional-attributes)
- [7. Schedule and budget](#7-schedule-and-budget)
- [8. Appendices](#8-appendices)

## 1. Introduction

### 1.1 Purpose

This specification defines the functional requirements, interfaces, performance targets, quality attributes, and scope for BnB-Kiosk, a school project built for Bake'n Brew café. It gives developers, testers, and reviewers one shared reference for what the customer kiosk and staff portal do and what stays outside the current release.

Walk-in café counters often bottleneck when staff have to take orders verbally, handle payment, and answer status questions at the same time. BnB-Kiosk splits self-service order entry from cashier verification and kitchen tracking so customers can build their own orders while staff keep control over payment approval and order preparation.

### 1.2 Scope

BnB-Kiosk builds two web applications from one Vue 3, TypeScript, Vite, Pinia, and Vue Router repository: a customer self-service kiosk (`dist/`) and a staff management portal (`dist-staff/`).

Included in the current release:

- Customer ordering across the welcome screen (Dine-in or Take-out), live categorized menu loaded from Supabase `public.products` (with loading, empty, and retry states, unavailable-item blocking, and stock-capped quantities), cart and quantity controls, receipt preview, Cash or E-wallet selection, idempotent order submission, waiting screen, queue number display, QR code generation, and live order tracking at `/order/<token>`.
- Cashier-gated order lifecycle (`pending -> confirmed -> cooking -> ready -> completed`, plus `pending -> rejected`) with atomic stock deduction on confirmation and no customer-side confirmation bypass.
- Staff registration using invitation codes, email/password sign-in, logout, password reset requests (with Supabase), route guards, and login attempt throttling.
- Staff order queue (`WAITING`, `COOKING`, `READY`), stock and availability management (`0` to `999`), completed-order sales summaries (`Today`, `This week`, `This month`, `All time`), searchable and sortable records table with CSV export, and staff profile, avatar, and password editing.
- Separate production builds for the kiosk and staff portal, plus a development-only `localStorage` preview mode for single-browser demonstrations.

Excluded from the current release:

- Online payment processing, GCash/Maya gateway integration, and automatic payment verification. Selecting Cash or E-wallet records the customer's chosen payment method only.
- Customer accounts, customer order history, loyalty points, promo or discount calculation rules (discount stays `0`), and customer edits or cancellations after order submission.
- Live WebSocket push to an already-open customer menu screen (the kiosk refreshes catalog prices, availability, and stock limits on page load or retry rather than holding an anonymous Realtime channel).
- In-app customer feedback submission or storage (`Have Feedback?` instructs customers to speak with staff at pickup).
- Receipt printer hardware integration, kitchen audio alerts, and multi-branch store management.
- In-app admin pages for creating or revoking invitation codes or deactivating staff accounts (handled through Supabase SQL or RPCs).

Limitations affecting implementation:

- Without Supabase environment variables, Vite development mode stores accounts, orders, and inventory overrides in one browser's `localStorage`, and the customer kiosk shows the static sample menu (`src/data/menu.ts`, labeled `Sample menu`). Data cannot be shared across devices, phones, browser profiles, or different origins and ports (such as `localhost:5173` and `localhost:5174`). Production builds never fall back to local demo storage.
- With Supabase configured, the customer kiosk fetches live products from `public.products` on mount (with a 10-second timeout) and uses `src/data/menu.ts` only for category ordering and local photo lookup. Staff availability edits and stock deductions on order confirmation apply on the kiosk's next load or retry, and `docs/supabase-menu-seed.sql` must be run once to seed `public.products`.
- Selecting Cash or E-wallet does not charge a customer or verify payment; pending orders wait until staff manually check payment and select `Proceed`.
- Phone QR tracking requires a hosted HTTPS deployment connected to the same Supabase project; a `localhost` URL cannot be opened from a customer's phone.
- Keeping `docs/supabase-staff-schema.sql` in the repository does not apply it to a live Supabase instance; auth, RPCs, and Row Level Security work only after the SQL script and product seed data are run on the target project.
- Item checkboxes on staff order cards reset on page reload, local preview stock starts at sample quantities (`10` per available item), password reset in local preview shows a message without sending email, and the package version is `0.0.0`.

### 1.3 Overview

Section 2 outlines the main system functions and user roles. Section 3 lists functional requirements ranked by priority with inputs, outputs, possible outcomes, and acceptance criteria. Section 4 describes user and software interfaces with sample flows. Sections 5 and 6 cover performance targets and non-functional quality attributes. Sections 7 and 8 summarize the project timeline, cost estimate, supporting documents, and glossary.

## 2. General description

### 2.1 Functions

BnB-Kiosk supports two connected workflows:

1. Customer kiosk: lets guests choose Dine-in or Take-out, browse menu categories with photos and prices, add or edit cart items, review a receipt preview, pick Cash or E-wallet, wait for cashier confirmation, and follow preparation progress through a queue number and QR link.
2. Staff portal: lets signed-in employees review incoming orders, confirm payment or cancel pending orders, move accepted orders through `Waiting`, `Cooking`, `Ready`, and `Completed`, update stock quantities and availability, filter and export served-order sales records to CSV, and update their profile and password.

User objectives fulfilled:

- Customers submit accurate orders at their own pace and see when their order is ready without repeatedly asking at the counter.
- Cashiers verify payment before kitchen preparation begins and keep a clear queue of active orders.
- Café staff track item stock and export completed sales records for daily or monthly review.

### 2.2 User community

- Customers: walk-in café guests who place Dine-in or Take-out orders on the kiosk without creating an account and optionally track status on their phone via the QR link.
- Café staff (`staff` role): authenticated cashiers and kitchen personnel who verify payment, accept or cancel pending orders, advance preparation stages, update stock counts, review sales records, and edit their own account details.
- Managers and administrators (`manager` and `admin` roles): authenticated staff with elevated database privileges (`is_active_admin()`) who generate or issue staff invitation codes and manage Supabase setup and deployment.

## 3. Functional requirements

Requirements are listed in ranked priority order (`P1` core ordering and confirmation, `P2` daily staff operations, `P3` account management and reporting).

### 3.1 Priority ranking and specification

| ID | Priority | Requirement | Input -> Output and possible outcomes | Acceptance criteria |
| --- | --- | --- | --- | --- |
| FR-01 | P1 | Select order type | Input: customer selects `Dine-in` or `Take-out` on `/`. Output: routes to `/menu` with the chosen order type attached. Outcome: order type is preserved through checkout and saved on the order. | On the welcome screen, the customer can choose `Dine-in` or `Take-out`, and the menu opens with that order type attached to the order. |
| FR-02 | P1 | Browse live menu and add items | Input: menu fetch on load or `Try again`, category tap, and `Add to order` item clicks. Output: live categorized items with prices, availability, and stock-capped quantities, plus running total. Outcome: loading, empty, and error states render without substituting sample items; unavailable or zero-stock items are disabled; `View my order` activates once at least one item is in the cart. | The customer can browse loaded menu categories with names, photos, prices, and availability, add available items up to remaining stock (max `99`) while the running total updates, and retry on load failure. `View my order` stays disabled while the order is empty. |
| FR-03 | P1 | Review, edit, or cancel a draft order | Input: `+`, `-`, or `Add more` in the order review dialog, or `Cancel Order` on the menu footer bar. Output: updated line quantities, subtotal, discount, and total, or cleared draft order. Outcome: reducing quantity to `0` removes the item; `Cancel Order` clears the cart and returns to the welcome screen (`/`). | On the order review screen, the customer can increase or decrease item quantities (reducing a quantity to `0` removes the item), see the updated subtotal, discount, and total, return to the menu with `Add more`, or abandon the draft order from the menu footer with `Cancel Order` (returning to `/`). |
| FR-04 | P1 | Select payment method and submit an order | Input: `Cash` or `E-wallet` choice and `Confirm Order` click, sent with a client-generated `requestId`, `orderType`, `paymentMethod`, and `items`. Output: persisted `pending` order containing server-generated `token`, `queueNumber`, and calculated totals. Outcomes: valid submission opens `Waiting for confirmation/payment`; duplicate clicks return the same order without creating another; invalid or unavailable items return an error message. | On the checkout screen, the customer can check the receipt preview, choose `Cash` or `E-wallet`, and select `Confirm Order` to submit once. Duplicate clicks or retries with the same `requestId` return the existing pending order instead of creating another one, then display `Waiting for confirmation/payment`. |
| FR-05 | P1 | Display queue number and track order status | Input: order `token` polled every 2.5 seconds via `/order/<token>`, plus `Done` click on the kiosk. Output: queue number (such as `#001`), generated QR image, `Open order tracking` link, and live stage view. Outcomes: `confirmed`, `cooking`, `ready`, and `completed` update the tracking screen; `rejected` displays `Please see the cashier`; `Done` clears only the kiosk session without cancelling the order. | After staff accept a pending order, the kiosk shows the assigned queue number and a generated QR code with an `Open order tracking` link to `/order/<token>`. The tracking page polls every 2.5 seconds across `Confirmed`, `Cooking`, `Ready`, and `Completed`, and `Done` returns the kiosk to the welcome screen without cancelling the order. |
| FR-06 | P1 | Register and authenticate staff accounts | Input: registration fields (full name, work email, invitation code, password of 8 to 128 characters with at least one letter and one number), login credentials, reset email, or `Log Out`. Output: authenticated staff session or login redirect. Outcomes: valid credentials open `/queue` (or `/staff/queue`); invalid codes, malformed fields, or wrong passwords return a validation/auth error; 5 consecutive login failures lock attempts for 60 seconds. | Staff can register with a valid invitation code and password rules, sign in, request a password reset email when Supabase is configured, and sign out via `Log Out`. Protected staff routes redirect unauthenticated visitors to the login page. |
| FR-07 | P1 | Review and accept or cancel incoming orders | Input: cashier verification of `Paid & receipt issued?` followed by `Proceed` or `Cancel` on a pending card in `WAITING`. Output: status transition `pending -> confirmed` (with atomic stock deduction on `public.products`) or `pending -> rejected`. Outcomes: `Proceed` deducts ordered quantities (marking `0`-stock items unavailable), unlocks the customer tracking QR, and keeps the card ready for cooking; insufficient stock rejects the confirmation with an alert banner; `Cancel` marks the order rejected and prompts the customer to see the cashier. | Authenticated staff see pending orders under the `WAITING` tab with queue number, order type, payment method, items, quantities, and total. Selecting `Proceed` deducts stock and moves the order to `confirmed` (or displays an error alert if stock is insufficient), and selecting `Cancel` marks it `rejected`. |
| FR-08 | P1 | Advance order preparation stages | Input: `Start Cooking`, `Mark Ready`, or `Mark Served` action on an order card. Output: status transition along `confirmed -> cooking -> ready -> completed`. Outcomes: cards move across `WAITING`, `COOKING`, and `READY`, customer tracking shows the new stage, completed orders enter sales records, and out-of-order transitions are rejected. | Staff can advance accepted orders only through `confirmed -> cooking -> ready -> completed` using `Start Cooking`, `Mark Ready`, and `Mark Served`, while invalid transitions are rejected. |
| FR-09 | P1 | Retrieve and sync backend API data | Input: `GET /rest/v1/products` (10-second timeout), RPC payloads (`create_kiosk_order`, `get_kiosk_order`, `staff_list_orders`, `staff_update_order_status`, `staff_update_product_availability`, `staff_update_own_profile`), and Realtime subscriptions on `orders` and `products`. Output: validated JSON records and live UI refreshes. Outcomes: Supabase handles persistence when configured; Vite dev mode falls back to same-origin `localStorage` and sample menu data when unconfigured; production builds return an unavailability error rather than using demo storage. | When `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set, all menu, order, product, and staff operations use Supabase PostgREST, RPCs, Auth, and Realtime. Without those settings in Vite development mode only, the app uses same-origin `localStorage` and local sample menu data. |
| FR-10 | P1 | Handle validation and request errors | Input: invalid form values, wrong credentials, unknown order tokens, or failed network requests. Output: plain-language alert or inline error state. Outcomes: the app stays responsive without crashing or resubmitting the order; tracking keeps the last known order state and lets the user select `Check again`. | When input fails validation, sign-in fails, an order token is missing, or a backend request fails, the application shows a plain-language message without crashing or creating duplicate orders. |
| FR-11 | P2 | Manage staff inventory and availability | Input: search text, availability filter (`All items`, `Available`, `Unavailable`), stock step buttons (`-5`, `-`, `+`, `+5`), and `Yes`/`No` availability toggle. Output: updated stock quantity (`0` to `999`) and boolean availability state. Outcomes: setting stock to `0` forces availability to `false`; enabling a zero-stock item sets its quantity to `1`; out-of-range values are rejected. | On the `Available` page, staff can search, filter, adjust stock within `0` to `999`, and toggle availability, with zero stock automatically marking an item unavailable and re-enabling a zero-stock item setting stock to `1`. |
| FR-12 | P3 | View served-order records and export CSV | Input: date preset (`Today`, `This week`, `This month`, `All time`), search query, order type filter, column sort click, and `Export CSV` click. Output: summary metrics (items served, completed orders, total sales, best-selling item), filtered item rows, and downloaded CSV file. Outcomes: only `completed` orders appear (`rejected` orders are excluded); CSV cells neutralize spreadsheet formula prefixes (`=`, `+`, `-`, `@`). | On the `Record` page, staff can view completed-order metrics and item rows by date range, filter by search or order type, sort columns, and download the filtered rows as a CSV file. |
| FR-13 | P3 | Manage staff profile and password | Input: profile edits (first name, last name, middle initial, email, home address, avatar PNG/JPEG/WebP under 2 MB), `Reset`, or matching new password fields. Output: updated staff profile record or password hash. Outcomes: `Save Changes` and `Save Password` activate only when valid changes exist; oversized or unsupported avatars and weak/mismatched passwords return validation errors. | On the `Account` page, signed-in staff can view their role, join date, and previous login, save or reset profile and avatar changes, and save a new password meeting the length and character rules. |

## 4. User interface requirements

### 4.1 Software interfaces

- User screens: the customer kiosk serves `/` (welcome), `/menu` (catalog, review dialog, checkout), and `/order/:token` (waiting screen, queue number with QR, live tracker). The staff portal serves `/login`, `/register`, `/queue`, `/availability`, `/records`, and `/account` (mounted under `/staff/*` during same-origin local dev). Visual layouts follow the Bake'n Brew Figma exports in `ordering system/` and adapt across kiosk screens and narrow mobile viewports.
- Supabase (`@supabase/supabase-js`): configured through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Provides PostgreSQL tables (`products`, `orders`, `order_items`, `staff_profiles`, `staff_invitations`), parameterized RPC functions (`create_kiosk_order`, `get_kiosk_order`, `staff_list_orders`, `staff_update_order_status`, `staff_update_product_availability`, `staff_update_own_profile`, `create_staff_invitation`, `generate_staff_invitation`), Supabase Auth for staff sessions and password resets, and Supabase Realtime channels (`staff-orders-watch`, `staff-products-watch`).
- Browser Web APIs: `localStorage` and `sessionStorage` for dev-only demo storage and active kiosk session state, `crypto.randomUUID()` and `crypto.subtle` for order identifiers and dev-mode salted SHA-256 hashing, `navigator.locks` for serialized local demo order creation, and `storage` events for same-origin tab synchronization.
- Local client libraries: `qrcode` generates PNG data-URL QR codes locally in the browser without calling a third-party QR API, and `@fontsource-variable/inter` bundles the UI font locally.
- Static web hosting: production deployment uses any HTTPS static host (such as Vercel, Netlify, or Cloudflare Pages) configured with SPA route fallback (`/*` to `index.html`) for the two separate build directories (`dist/` and `dist-staff/`).

### 4.2 Examples

Customer order and tracking flow:

1. Customer taps `Take-out` on the welcome screen, adds `Spanish Latte` (PHP 180), reviews the cart, selects `E-wallet`, and selects `Confirm Order`.
2. Kiosk displays `Waiting for confirmation/payment` with the order reference and total while polling `get_kiosk_order` every 2.5 seconds.
3. Cashier checks payment in the staff `WAITING` tab and selects `Proceed`.
4. Kiosk displays `Queue Number #001` and a QR code linking to `/order/<token>`, where the customer sees status move from `Confirmed` to `Cooking` and `Ready`.

Staff fulfillment and records flow:

1. Staff sign in at `/staff/login` (or `/login`) and open `Orders -> WAITING`.
2. Staff select `Proceed`, then `Start Cooking`, `Mark Ready`, and `Mark Served` as preparation finishes.
3. Once marked served, the order's line items appear on the `Record` page under `Today` and can be exported via `Export CSV`.

Reference screenshots of every customer and staff screen are stored in `docs/screenshots/user-manual/` and illustrated in the [User Manual](<User Manual.md>).

## 5. Performance requirements

### 5.1 Response time

- Client-side interactions (switching menu categories, updating cart quantities, searching inventory, filtering records, and sorting table columns) should respond immediately in the browser without waiting on a server round-trip.
- Customer order tracking polls `get_kiosk_order` every 2.5 seconds, so status updates made by staff appear on the kiosk or customer phone within a few seconds.
- Staff order queue and inventory pages subscribe to Supabase Realtime (or same-origin browser `storage` events in dev preview) so incoming orders and stock updates appear live without manual page reloads.

### 5.2 Throughput

- Designed for single-store café counter traffic, handling concurrent walk-in kiosk submissions alongside one or more signed-in staff tabs.
- Server-side database checks in `create_kiosk_order` allow up to 50 line items per order and quantities of `1` to `99` per item, while staff stock counts accept `0` to `999` units per product.

### 5.3 Scalability

- Production builds separate the customer kiosk (`dist/`, containing zero staff code) from the staff portal (`dist-staff/`), allowing each frontend to be served from a static CDN while sharing one Supabase PostgreSQL and Realtime backend.
- Multiple kiosks and staff terminals can run against the same Supabase project because queue numbers use a shared PostgreSQL sequence (`public.kiosk_queue_number_seq`) and `requestId` uniqueness prevents duplicate writes under retries.
- Development-only `localStorage` preview mode is intentionally bounded to one browser profile and origin and is not used for multi-device scaling.

## 6. Non-functional attributes

The core attributes below cover usability, reliability, and security, followed by the maintainability, portability, and testability requirements tracked for the project.

| Category | Requirement |
| --- | --- |
| Usability | Both interfaces must stay readable and consistent with the Bake'n Brew Figma layouts in `ordering system/`. They must work with touch and mouse input across kiosk and narrow mobile viewports without horizontal overflow on customer ordering and tracking screens. Controls such as `View my order`, `Save Changes`, and `Save Password` stay disabled until valid input exists. |
| Reliability | Validation, authentication, storage, and network errors must be handled without unexpected application termination. Order submission uses a unique `requestId` for idempotency so double-clicks or retries never create duplicate orders, and pending kiosk orders survive page reloads until staff act on them. |
| Security | Sensitive credentials and `.env.local` / `.env.*local` files must not be committed to GitHub; only the publishable client key may be exposed to the browser, never a service-role key. Supabase access runs through parameterized RPCs with locked `search_path`, server-side `CHECK` constraints, and Row Level Security (`public.is_active_staff()`). Staff invitation codes are stored as SHA-256 digests, login throttles for 60 seconds after 5 consecutive failures, internal redirects reject open-redirect payloads (`//` and `\`), and CSV exports neutralize spreadsheet formula prefixes. |
| Maintainability | Code must stay modular, readable, and documented across Vue 3 and TypeScript layers (`views/`, `components/`, `stores/`, `services/`, `router/`, `lib/`, `data/`), with separate kiosk (`dist/`) and staff (`dist-staff/`) builds. Type checking (`npm run type-check`), linting (`npm run lint` via Oxlint and ESLint), formatting (`npm run format` via Prettier), and markdown guides in `docs/` keep the codebase consistent. |
| Portability | The project specifies its supported runtime and platforms: Node.js `^22.18.0` or `>=24.12.0` (matching `package.json`), npm, Git, and modern browsers (Chromium, Firefox, and WebKit/Safari) across Windows, macOS, and Linux. Deployed hosting must serve over HTTPS with SPA fallback (`/*` to `index.html`). |
| Testability | The project includes repeatable automated tests for its core features: Vitest unit and component tests (`npm run test:unit -- --run`, isolated from `.env.local` in `vitest.config.ts`) covering `security`, `products`, `orders`, `staffAuth`, `staffOrders`, `staffProducts`, `staffRecords`, and customer/staff views (`MenuView`, `MenuProductsView`, `CheckoutView`, `StaffAuthViews`, `StaffQueueView`, `StaffAvailabilityView`, `StaffRecordsView`, `StaffAccountView`), plus Playwright end-to-end tests (`npm run test:e2e`) covering pending-order reload persistence, separate-actor staff confirmation, QR tracking, and missing-order handling. |

## 7. Schedule and budget

### 7.1 Timeline

Development milestones recorded in the repository history:

| Dates (2026) | Milestone | Deliverables |
| --- | --- | --- |
| Nov 15 | UI design handoff | Exported Bake'n Brew Figma screens into `ordering system/` and initialized project assets. |
| Nov 16 to Nov 17 | Customer kiosk build | Implemented welcome screen, categorized menu (`Best Sellers`, `Starter`, `Rice Meals`, `Pasta`, `Noodles`, `Chicken Wings`), promotional banner, order review dialog, checkout, pending confirmation screen, and QR tracking. |
| Nov 19 to Nov 21 | Staff portal and security | Implemented standalone staff routing, invitation-code registration, login throttling, order queue (`Proceed`/`Cancel` and preparation stages), inventory availability page, served-order records with CSV export, account/avatar/password management, and Supabase SQL schema. |
| Nov 22 | Project documentation | Added [Documentation Guide](<Documentation Guide.md>), [User Manual](<User Manual.md>), and 22 walkthrough screenshots. |
| Nov 23 | Documentation suite and API integration | Added SRS, Technical Design, API Documentation, Design Patterns, Testing and Quality Report, and integrated live Supabase menu/product loading, `supabase-menu-seed.sql`, and stock deduction on order confirmation onto `main`. |

### 7.2 Cost estimate

BnB-Kiosk is a student project built on open-source software and free-tier cloud services:

| Item | Tool or service | Estimated cost (PHP) | Notes |
| --- | --- | --- | --- |
| Frontend framework and tooling | Vue 3, TypeScript, Vite, Pinia, Vue Router, Vitest, Playwright, `qrcode` | 0 | Open-source packages installed via npm. |
| Backend database and auth | Supabase (Free tier) | 0 | Covers PostgreSQL, Auth, RPCs, and Realtime for school demo volume. |
| Frontend static hosting | Vercel, Netlify, or Cloudflare Pages (Free tier) | 0 | Hosts separate kiosk (`dist/`) and staff (`dist-staff/`) URLs over HTTPS. |
| Custom domain or paid cloud tier | Optional | Variable | Needed only if Bake'n Brew deploys beyond free-tier limits or adds a custom domain. |

## 8. Appendices

### 8.1 Supplementary information

- [Documentation Guide](<Documentation Guide.md>): setup, local demo instructions, Supabase configuration, build/test commands, and troubleshooting.
- [User Manual](<User Manual.md>): step-by-step customer and staff operating instructions with screenshots.
- [API Documentation](<API Documentation.md>): Supabase PostgREST, RPC, Auth, Realtime contracts, polling rules, and error mapping.
- [Staff Backend Setup](staff-backend-setup.md): two-URL architecture, deployment steps, and security controls.
- [Supabase Staff Schema](supabase-staff-schema.sql): PostgreSQL tables, RLS policies, triggers, Realtime publication, and RPC definitions.
- [Supabase Menu Seed](supabase-menu-seed.sql): idempotent 27-item catalog seed for `public.products`.
- `ordering system/`: exported Figma screen references used to style the kiosk and staff portal.

### 8.2 Glossary

- Kiosk: the customer-facing self-service web application used to browse the menu, submit orders, and view queue numbers.
- Staff portal: the authenticated employee web application used to confirm payment, update preparation stages, manage inventory, export sales records, and update staff accounts.
- Queue number: sequential numeric order identifier (formatted as `#001`, `#002`, etc.) shown to customers and staff.
- Order token: unguessable server-generated UUID used in `/order/<token>` so a customer can view status for their order alone.
- `requestId`: client-generated UUID attached to an order submission to make retries and double-clicks idempotent.
- RPC (Remote Procedure Call): a parameterized PostgreSQL function exposed by Supabase (such as `create_kiosk_order` or `staff_update_order_status`).
- RLS (Row Level Security): PostgreSQL policies restricting table reads and writes by authentication state and active staff status.
- SPA (Single-Page Application): a browser app routed on the client side that needs hosting fallback rules (`/*` to `index.html`) for direct URLs.
- Local preview mode: Vite development-only mode using same-origin `localStorage` so the kiosk and `/staff/*` routes can be demonstrated in two tabs without Supabase.
