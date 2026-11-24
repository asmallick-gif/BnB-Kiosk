# BnB-Kiosk Testing and Quality Report

Bake'n Brew customer kiosk and staff portal  
Branch: `feat/cleanup-hardening-elapsed-timer` · Executed: 2026-11-24

This report records the test cases, expected and actual results, pass/fail status, known defects, applied and recommended fixes, and overall quality assessment for BnB-Kiosk based on live automated checks run against the repository. It complements the [Software Requirements Specification](<Software Requirements Specification.md>) and [Technical Design](<Technical Design.md>).

## Contents

- [1. Test environment and execution summary](#1-test-environment-and-execution-summary)
- [2. Detailed test cases](#2-detailed-test-cases)
- [3. Known defects and fixes](#3-known-defects-and-fixes)
- [4. Final quality assessment](#4-final-quality-assessment)

## 1. Test environment and execution summary

**Environment:** Windows, Node.js `v26.13.0`, npm `11.20.0`, Vitest `4.1.12` (with JSDOM, isolated from `.env.local` in `vitest.config.ts`), Vite `8.3.8`, Vue `3.5.45`, Playwright `1.65.1`.

| Quality gate | Command executed | Result | Summary |
| --- | --- | --- | --- |
| Unit and component tests | `npm run test:unit -- --run` | Pass | 17 of 17 test files passed; 67 of 67 tests passed |
| TypeScript / Vue type check | `npm run type-check` (`vue-tsc --build`) | Pass | Exit code `0`, zero type errors |
| ESLint | `npm run lint:eslint` (`eslint . --fix --cache`) | Pass | Exit code `0`, zero errors or warnings |
| Oxlint | `npm run lint:oxlint` (`oxlint . --fix`) | Pass | Exit code `0`, 0 errors and 0 warnings across 58 files (144 rules) |
| Customer kiosk build | `npm run build` | Pass | Exit code `0`, 119 modules built into `dist/` (zero staff or `AboutView` chunks) |
| Standalone staff build | `npm run build:staff` | Pass | Exit code `0`, 136 modules built into `dist-staff/` |
| End-to-end browser tests | `npm run test:e2e -- --project=chromium` | Blocked | Browser binary (`chromium`) not installed in this checkout (`npx playwright install` required) |
| Dependency audit | `npm audit` | Warning (Dev-only) | 5 moderate advisories inside dev-only `@vue/test-utils` -> `js-beautify` -> `glob`/`minimatch` (not shipped in production bundles) |

## 2. Detailed test cases

### TC-01: Customer menu and order review

| Field | Value |
| --- | --- |
| **Module Name** | Customer Kiosk (`MenuView.vue`) |
| **Test Case Id** | TC-01 |
| **Created By** | Automated suite (`src/views/__tests__/MenuView.spec.ts`) |
| **Test Case Description** | Verify item addition, quantity updates, empty-cart guard, and cart preservation between review and checkout. |
| **Preconditions** | Kiosk mounted at `/menu?type=take-out` with empty cart and dialog mock enabled. |
| **Environment** | Windows, Node `v26.13.0`, Vitest `4.1.12` (JSDOM) |
| **Scenario Name** | Build a Take-out order, adjust quantities, preview receipt, and verify empty-cart handling. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01 | Check checkout button before adding items | Empty cart | `Proceed to Checkout` is disabled | `Proceed to Checkout` has `disabled` attribute | Pass | Guard blocks empty orders |
| TC-01 | Add Spanish Latte and Mac N Cheese; increase Spanish Latte quantity to 2 | `Spanish Latte` (PHP 180) x2, `Mac N Cheese` (PHP 250) x1 | Subtotal `PHP 610.00`, Discount `PHP 0.00`, 3 items in summary | Receipt shows `Take-out - 3 items`, `Total₱610.00`, focus moves to `#receipt-title` | Pass | Line totals stay synchronized |
| TC-01 | Select `E-wallet`, click `Back to order`, then return to checkout | Payment choice `e-wallet` | Cart quantities and `E-wallet` choice remain preserved | Quantity stays `2`, total stays `Total₱610.00`, `E-wallet` remains checked | Pass | Verified in 659ms |
| TC-01 | Decrease both items down to `0` | Reduce quantity to `0` | Items removed, empty status shown, `View my order` and `Proceed to Checkout` disabled | Status shows `Your order is empty`, total `Total₱0.00`, buttons disabled | Pass | Verified in 100ms |

### TC-02: Checkout submission and order idempotency

| Field | Value |
| --- | --- |
| **Module Name** | Customer Checkout and Order Repository (`CheckoutView.vue`, `src/services/orders.ts`) |
| **Test Case Id** | TC-02 |
| **Created By** | Automated suite (`src/views/__tests__/CheckoutView.spec.ts`, `src/services/__tests__/orders.spec.ts`) |
| **Test Case Description** | Verify idempotent order submission, in-flight double-tap blocking, catalog price calculation, and invalid input rejection. |
| **Preconditions** | Valid `Dine-in` cart with `Spanish Latte` (`best-sellers-1`); clean `localStorage` and `sessionStorage`. |
| **Environment** | Windows, Node `v26.13.0`, Vitest `4.1.12` (JSDOM) |
| **Scenario Name** | Submit order with retries, double-clicks, invalid quantities, and unknown tokens. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-02 | Call `submitOrder` twice with the same `requestId` | `best-sellers-1`, qty `2`, same UUID | One `pending` order stored with catalog total `360`; second call returns same `token` | Single `localStorage` entry created, `total === 360`, matching `token`, `isOrderConfirmed` is `false` | Pass | Verified in 9ms |
| TC-02 | Trigger `Confirm Order` twice while submission promise is pending | Mocked pending `submitOrder` | Second tap ignored; confirm, fieldset, and back controls disabled until settled | `submitOrder` called once; controls disabled during flight and re-enabled after rejection | Pass | Verified in 104ms |
| TC-02 | Retry `Confirm Order` after failure alert | Rejected error `Unable to send your order.` | Receipt preserved; retry reuses identical `requestId`; no `bnb.active-order` saved | Alert shown, total `Total₱180.00` kept, both calls sent identical `requestId` | Pass | Verified in 194ms |
| TC-02 | Submit invalid quantities and query unknown token | Quantities `0`, `-1`, `0.5`, `100`; random UUID | All invalid quantities rejected without writes; unknown token throws `could not be found` | Every invalid case threw expected error with `localStorage.length === 0` | Pass | 5 parameterized checks passed |

### TC-03: Staff authentication, route guards, and security validation

| Field | Value |
| --- | --- |
| **Module Name** | Staff Authentication and Security (`StaffLoginView.vue`, `StaffRegisterView.vue`, `staffAuth.ts`, `security.ts`) |
| **Test Case Id** | TC-03 |
| **Created By** | Automated suite (`StaffAuthViews.spec.ts`, `staffAuth.spec.ts`, `security.spec.ts`) |
| **Test Case Description** | Verify route protection, invitation-code signup, salted password hashing, brute-force throttling, and injection blocking. |
| **Preconditions** | Clean `localStorage` and reset login throttle; local dev invite code `BNB-5JSN-SYN3`. |
| **Environment** | Windows, Node `v26.13.0`, Vitest `4.1.12` (JSDOM) |
| **Scenario Name** | Guard `/queue`, register with invite code, test bad payloads, and lock out after 5 failed logins. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-03 | Navigate unauthenticated to `/queue` | No active session | Redirect to `staff-login` with `redirect=/queue` | Routed to `staff-login`, query `redirect` equals `/queue` | Pass | Open redirects (`//evil.com`, `/\evil.com`) blocked in `security.spec.ts` |
| TC-03 | Register staff with valid invite code, sign out, and sign back in | `Maria.Santos@BakeNBrew.ph`, `BNB-5JSN-SYN3`, `Password123` | Email lowercased, password stored as salted SHA-256 (never plaintext), re-login succeeds | Account created, raw `localStorage` lacks `Password123`, re-login returned matching user | Pass | Verified in 76ms |
| TC-03 | Submit SQLi/XSS payloads and mismatched registration passwords | `"admin' OR '1'='1@test.com"`, `"<script>alert(1)</script>"`, wrong invite code | All malicious inputs rejected before persistence; mismatched passwords show alert | Expected validation errors thrown; `registerStaff` not called on mismatch | Pass | Verified across 3 specs |
| TC-03 | Attempt login with wrong password 5 times, then try valid password | `ana@bakenbrew.ph`, 5 wrong attempts then `Password123` | 6th attempt blocked with `Too many failed attempts` lockout | Threw `Too many failed attempts` even when valid password was supplied | Pass | 60-second lockout active |

### TC-04: Staff order queue and cashier confirmation gate

| Field | Value |
| --- | --- |
| **Module Name** | Staff Order Queue (`StaffShellView.vue`, `StaffQueueView.vue`, `staffOrders.ts`) |
| **Test Case Id** | TC-04 |
| **Created By** | Automated suite (`StaffQueueView.spec.ts`, `staffOrders.spec.ts`) |
| **Test Case Description** | Verify pending orders require cashier `Proceed` or `Cancel` before preparation starts, and stage skips are rejected. |
| **Preconditions** | Signed-in staff session; two pending orders (`#001` Dine-in Cash, `#002` Take-out E-wallet). |
| **Environment** | Windows, Node `v26.13.0`, Vitest `4.1.12` (JSDOM) |
| **Scenario Name** | Cancel one pending order, confirm another, advance to `COOKING`, and block invalid stage jumps. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-04 | Open `/queue` with two pending orders | Orders `#001` and `#002` (`pending`) | Both cards show `Proceed` and `Cancel`; `Start Cooking` is absent | 2 cards rendered, 0 `.order-card__cta` buttons, 2 `Proceed` and 2 `Cancel` buttons | Pass | Cashier gate enforced |
| TC-04 | Click `Cancel` on `#002`, then click `Proceed` and `Start Cooking` on `#001` | `#002` rejected; `#001` confirmed -> cooking | `#002` removed with toast; `#001` unlocks `Start Cooking` and moves to `COOKING` tab showing `Mark Ready` | Toasts matched (`Order Cancelled`, `Payment Confirmed`, `Started Cooking`); `#001` appeared under `COOKING` with `Mark Ready` | Pass | Verified in 164ms |
| TC-04 | Click `Proceed` when backend status update rejects | Pending `#001` with simulated backend error | `.queue-error` alert displayed, no toast emitted, `Proceed` button re-enabled, zero unhandled rejections | Alert rendered `Order could not be found.`, toast absent, button re-enabled | Pass | Verified in 29ms |
| TC-04 | Attempt invalid transition `pending -> ready` via `updateStaffOrderStatus` | Pending order token, target `'ready'` | Transition rejected with invalid-stage error | Rejected with `Cannot change order from pending to ready` | Pass | FSM guard confirmed |

### TC-05: Staff inventory availability and stock validation

| Field | Value |
| --- | --- |
| **Module Name** | Staff Inventory (`StaffAvailabilityView.vue`, `staffProducts.ts`) |
| **Test Case Id** | TC-05 |
| **Created By** | Automated suite (`StaffAvailabilityView.spec.ts`, `staffProducts.spec.ts`) |
| **Test Case Description** | Verify stock stepping (`-5` to `0`), zero-stock auto-unavailability, re-enabling to stock `1`, and invalid input rejection. |
| **Preconditions** | Signed-in staff session on `/availability`; default local stock `10` for `Spanish Latte`. |
| **Environment** | Windows, Node `v26.13.0`, Vitest `4.1.12` (JSDOM) |
| **Scenario Name** | Deplete stock to zero, filter unavailable items, re-enable item, and test bad product IDs/quantities. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-05 | Search `Spanish Latte` and click `-5` twice | `Spanish Latte` (initial qty `10`) | Quantity drops `10 -> 5 -> 0`, pill switches `Yes -> No`, unavailable toast shown | Quantity `0`, pill `No`, toast `Spanish Latte is unavailable` | Pass | Verified in 258ms |
| TC-05 | Filter by `Unavailable` and toggle pill back to available | Unavailable filter tab | Item listed, toggling sets availability `true` and stock to `1` | Toast `Spanish Latte is available`, row left `Unavailable` filter | Pass | Matches SRS FR-11 |
| TC-05 | Call `updateStaffProductStock` with SQLi ID and quantities `-1` / `1000` | `"best-sellers-1'; DROP TABLE products;--"`, `-1`, `1000` | All three calls rejected with validation errors | Rejected with `Invalid product identifier` and `between 0 and 999` | Pass | Verified in 4ms |

### TC-06: Staff served-order records and CSV export

| Field | Value |
| --- | --- |
| **Module Name** | Staff Records (`StaffRecordsView.vue`, `staffRecords.ts`) |
| **Test Case Id** | TC-06 |
| **Created By** | Automated suite (`StaffRecordsView.spec.ts`, `staffRecords.spec.ts`) |
| **Test Case Description** | Verify KPI calculations, date/type/search filters, cancelled-order exclusion, sorting, and CSV formula neutralization. |
| **Preconditions** | Seeded completed orders (`#024`, `#023`) and one rejected order (`#022`). |
| **Environment** | Windows, Node `v26.13.0`, Vitest `4.1.12` (JSDOM) |
| **Scenario Name** | Compute served metrics, filter rows, sort by quantity, and export formula-safe CSV. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-06 | Open `/records` and inspect KPI cards and rows | 2 completed orders (5 items, `PHP 940`), 1 rejected order (`PHP 650`) | Rejected order excluded; KPI shows `5`, `₱940.00`, `Spanish Latte`; 3 line rows rendered | Values matched `5`, `₱940.00`, `Spanish Latte`; 3 rows displayed | Pass | Verified in 232ms |
| TC-06 | Filter by `Take-out`, then reset and search `Alfredo` | Type `Take-out`; query `Alfredo` | 1 matching row (`#023`) for `Take-out`; 1 matching row (`Chicken Alfredo`) for search | Both filters narrowed rows accurately | Pass | Date presets (`today`/`week`/`month`/`all`) also passed in `staffRecords.spec.ts` |
| TC-06 | Export CSV containing item name `=CMD|calc` | Formula payload `=CMD|calc` | Output prefixes cell with `'` inside quotes (`"'=CMD|calc"`) | CSV contained `"'=CMD|calc"` | Pass | Blocks CSV formula injection |

### TC-07: Staff account profile and password management

| Field | Value |
| --- | --- |
| **Module Name** | Staff Account (`StaffAccountView.vue`) |
| **Test Case Id** | TC-07 |
| **Created By** | Automated suite (`src/views/__tests__/StaffAccountView.spec.ts`) |
| **Test Case Description** | Verify initial profile population, disabled clean-form save guard, profile edit save, and password change persistence. |
| **Preconditions** | Registered local account `Maria Santos` (`maria@bakenbrew.ph`, `Password123`). |
| **Environment** | Windows, Node `v26.13.0`, Vitest `4.1.12` (JSDOM) |
| **Scenario Name** | Edit middle initial and home address, update password, sign out, and sign back in with new password. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-07 | Load `/account` without edits | Existing user `Maria Santos` | Fields prefilled; `Save Changes` disabled | Inputs populated; `.btn-primary--olive` disabled | Pass | Verified in 410ms |
| TC-07 | Set middle initial `R` and home address, then submit | `R`, `123 Sampaguita St, Quezon City` | Dirty badge appears; save updates header to `Maria R. Santos` with toast | `.dirty-badge` showed `Unsaved changes`; toast showed `Profile changes saved`; header became `Maria R. Santos` | Pass | Persistence confirmed |
| TC-07 | Set new password `NewBrew2026`, sign out, and sign back in | `NewBrew2026` | Password update toast shown; re-login succeeds with updated profile | Toast `Password updated`; `loginStaff` succeeded and returned updated address and full name | Pass | Salted hash rotated |

### TC-08: Static analysis and dual production builds

| Field | Value |
| --- | --- |
| **Module Name** | Build and Code Quality Pipeline (`vite.config.ts`, `tsconfig.json`, `.oxlintrc.json`, `eslint.config.ts`) |
| **Test Case Id** | TC-08 |
| **Created By** | Live CLI verification |
| **Test Case Description** | Verify type checking, linting, and isolated production bundles for customer kiosk and staff portal. |
| **Preconditions** | Dependencies installed via `npm ci`. |
| **Environment** | Windows, Node `v26.13.0`, npm `11.20.0` |
| **Scenario Name** | Run `type-check`, `eslint`, `oxlint`, `build`, and `build:staff`. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-08 | Run `npm run type-check` and `npx eslint .` | Full `src/` and `e2e/` | Exit code `0` with zero errors | Both exited `0` with zero diagnostics | Pass | Clean TypeScript and ESLint |
| TC-08 | Run `npx oxlint .` (read-only) | 58 files, 144 rules | Exit code `0` with zero errors | Exit code `0`: 0 errors and 0 warnings | Pass | `DEF-01` to `DEF-03` and `DEF-07` resolved |
| TC-08 | Run `npm run build` and `npm run build:staff` | Production Vite modes | Both succeed; `dist/` excludes all staff views | `dist/` built cleanly (119 modules, zero staff or `AboutView` chunks); `dist-staff/` built cleanly (136 modules) | Pass | Bundle isolation verified |

### TC-09: End-to-end browser order confirmation and responsive layouts

| Field | Value |
| --- | --- |
| **Module Name** | End-to-End Customer Flow (`e2e/order-confirmation.spec.ts`, `e2e/vue.spec.ts`) |
| **Test Case Id** | TC-09 |
| **Created By** | Playwright suite (`playwright.config.ts`) |
| **Test Case Description** | Verify pending reload persistence, separate-tab staff confirmation unlocking QR tracking, missing-order alerts, reduced motion, and responsive viewports (`1024x1638`, `375x667`, `667x375`). |
| **Preconditions** | Playwright Chromium browser installed (`npx playwright install`). |
| **Environment** | Windows, Playwright `1.65.1`, Chromium project |
| **Scenario Name** | Execute all 7 Playwright Chromium tests against local Vite server (`localhost:5173`). |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-09 | Run `npm run test:e2e -- --project=chromium` | 2 tests in `order-confirmation.spec.ts`, 5 tests in `vue.spec.ts` | All 7 browser tests pass across viewports | 7 of 7 failed to launch browser (`chromium-1255\chrome-win64\chrome.exe` missing) | Blocked | Environment prerequisite only; run `npx playwright install` then re-run |

### TC-10: Customer product API and live menu states

| Field | Value |
| --- | --- |
| **Module Name** | Customer Product Repository & Menu (`src/services/products.ts`, `src/views/MenuView.vue`) |
| **Test Case Id** | TC-10 |
| **Created By** | Automated suite (`src/services/__tests__/products.spec.ts`, `src/views/__tests__/MenuProductsView.spec.ts`) |
| **Test Case Description** | Verify live `public.products` parsing, zero-stock unavailability, stock quantity capping, malformed/duplicate row rejection, 10-second request timeout, loading/error/empty UI states, and dev preview fallback. |
| **Preconditions** | Mocked Supabase query builder in `products.spec.ts`; mocked `listMenuProducts` in `MenuProductsView.spec.ts`. |
| **Environment** | Windows, Node `v26.13.0`, Vitest `4.1.12` (JSDOM) |
| **Scenario Name** | Load live API catalog, enforce stock caps, reject invalid payloads, abort hung requests, and recover on retry. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-10 | Fetch live products with API price, zero stock, and new DB category | `Spanish Latte` (`185.50`, stock `3`), `stock_quantity: 0`, `special-drinks` | Preserves category order and local photos, marks zero-stock unavailable, leaves unknown photos blank | All assertions passed across 3 service tests | Pass | Verified in 9ms |
| TC-10 | Feed malformed, negative-price, fractional-stock, invalid-slug, and duplicate rows | 7 malformed datasets; empty array `[]` | Empty array returns `[]` without sample fallback; all 7 malformed sets throw `invalid response` | Empty catalog stayed empty; all 7 malformed cases rejected | Pass | Strict response validation |
| TC-10 | Simulate API error, network error, and 10-second hung request | Fake timers advanced `10_000ms` | Request aborts, timer clears (`0` pending), user-friendly message thrown | `signal.aborted === true`, `getTimerCount() === 0`, error matched | Pass | Verified in 5ms |
| TC-10 | Mount `MenuView` across loading, API-priced cart/stock cap, failure retry, and empty catalog | `Spanish Latte` (`185.50`, stock `2`), `Iced Latte` (unavailable), digit-prefixed slug `2-for-1` | Loading hides sample items; unavailable item disabled; qty caps at `2`; digit-prefixed slug scrolls safely; failure and empty states retry cleanly | All 5 `MenuProductsView.spec.ts` checks passed | Pass | Added selector/matchMedia safety check |

### TC-11: Customer order status, live elapsed timer, and terminal polling stop

| Field | Value |
| --- | --- |
| **Module Name** | Customer Order Status & Tracking (`src/views/OrderStatusView.vue`, `src/lib/format.ts`) |
| **Test Case Id** | TC-11 |
| **Created By** | Automated suite (`src/views/__tests__/OrderStatusView.spec.ts`) |
| **Test Case Description** | Verify pending payment view, live ticking `Time Elapsed` counter across active states, QR generation and fallback alert, and polling/timer stop on terminal states (`completed`, `rejected`). |
| **Preconditions** | Fake Vitest timers pinned to `2026-11-24T05:00:00.000Z`; mocked `getOrder` and `QRCode.toDataURL`. |
| **Environment** | Windows, Node `v26.13.0`, Vitest `4.1.12` (JSDOM) |
| **Scenario Name** | Poll `pending -> confirmed`, tick elapsed counter on customer tracking view, handle QR error, and halt timers on terminal statuses. |

| Test Case Id | Test Steps | Test Data | Expected Result | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- |
| TC-11 | Mount pending kiosk order and advance clock by `2500ms` | `createdAt` 90s prior, transitions `pending -> confirmed` | Shows `00:01:30`, transitions to Queue Number `#007` with `00:01:32` and QR image | All assertions matched | Pass | Covers kiosk waiting & QR unlock |
| TC-11 | Mount customer tracking view in `cooking`, advance `2000ms`, then transition to `completed` | `createdAt` 6m50s prior | Displays `00:06:50` -> `00:06:52`, hides `.elapsed-pill` once `completed` | Ticked cleanly and hid pill on completion | Pass | Shared `formatElapsedDuration` matches staff card |
| TC-11 | Reject `QRCode.toDataURL` promise | Confirmed kiosk order | Displays `QR code unavailable` fallback status | Fallback status rendered cleanly | Pass | Graceful degradation |
| TC-11 | Mount `rejected` order and advance timers `10_000ms` | Rejected order | Hides elapsed pill and keeps `getOrder` at `1` call (polling stopped) | `getOrder` called once; no background polls | Pass | Prevents infinite polling |

## 3. Known defects and fixes

### 3.1 Defects tracked and resolved

| ID | Severity | Location | Observed defect | Status | Applied or recommended fix |
| --- | --- | --- | --- | --- | --- |
| DEF-01 | Low | `src/services/staffProducts.ts:94` | Oxlint `no-extra-boolean-cast` error on `Boolean(row.available) ? 10 : 0` | Resolved | Replaced with `row.available ? 10 : 0` and normalized `available` to `false` whenever `stock_quantity === 0`. |
| DEF-02 | Low | `src/services/products.ts:1` | Oxlint `no-unused-vars` error: unused 1-line stub importing `supabase` | Resolved | Replaced stub with live `listMenuProducts()` implementation from `api-integration`. |
| DEF-03 | Low | `src/lib/security.ts:5` | Oxlint `no-control-regex` error on ASCII control-character regex `/[\u0000-\u001F\u007F]/g` | Resolved | Replaced regex with a `charCodeAt` loop in `stripControlChars`, eliminating the error with zero lint suppressions. |
| DEF-04 | Medium | `src/views/MenuView.vue`, `src/services/products.ts`, `docs/supabase-staff-schema.sql` | Customer kiosk menu read static `menu.ts`, decoupled from `public.products` stock and availability | Resolved | Integrated `listMenuProducts()`, stock-capped cart controls, `docs/supabase-menu-seed.sql`, `public.products` Realtime publication, and atomic stock deduction on order confirmation. |
| DEF-05 | Medium | `e2e/` test runner | Playwright E2E suite could not run in this checkout because browser binaries were not downloaded | Blocked (env) | Run `npx playwright install` and re-run `npm run test:e2e -- --project=chromium`, then record green output before final submission. |
| DEF-06 | Low | `src/assets/staff/staff-hero.png`, `src/assets/images/welcome-background.jpg` | Large unoptimized images shipped in production bundles (`2.61 MB` PNG and `1.01 MB` JPEG) | Open | Convert and compress hero assets to WebP (target under 250 KB each) to speed up kiosk and staff first paint. |
| DEF-07 | Low | `src/components/HelloWorld.vue`, `TheWelcome.vue`, `src/views/AboutView.vue`, `src/stores/counter.ts` | Unused Vue starter template files remained in `src/` and `AboutView` was bundled into `dist/` | Resolved | Removed all 12 Vue starter scaffold files, `/about` route, `HelloWorld.spec.ts`, and unused `--vt-c-*` variables in `src/assets/base.css`. |
| DEF-08 | Low | `src/views/OrderStatusView.vue`, `src/components/staff/StaffOrderCard.vue` | Missing unit coverage for `OrderStatusView.vue`; item preparation checkboxes reset on page reload | Partially resolved | Added `OrderStatusView.spec.ts` (4 tests covering polling, QR fallback, elapsed timer, and terminal polling stop). Staff item checklists remain local in-memory UI state. |
| DEF-09 | Low | `package-lock.json` | `npm audit` reports 5 moderate severity advisories | Triaged (Dev-only) | Confirmed via `npm audit` all 5 advisories live under dev-only `@vue/test-utils` (`js-beautify` -> `glob`/`minimatch`) and are not shipped in `dist/` or `dist-staff/`. Avoid `npm audit fix --force` (which downgrades `@vue/test-utils`). |

### 3.2 Applied fixes verified in the repository

- **Codebase audit, hardening, cleanup, and customer elapsed timer (`2026-11-24`):** Synced `docs/supabase-menu-seed.sql` and `products.spec.ts` to all 57 menu items (locked by `menu.spec.ts`), blocked duplicate product IDs in `create_kiosk_order`, guarded corrupted browser JSON storage in `CheckoutView.vue`, `orders.ts`, and `staffOrders.ts`, consolidated order parsing and PHP/elapsed formatting into shared helpers (`src/lib/format.ts`, `orders.ts`), sanitized restored avatar URLs in `staffAuth.ts`, fixed digit-prefixed category scrolling and `matchMedia` guards in `MenuView.vue`, scoped `StaffRecordsView.vue` cancelled count to the selected date range, removed all 12 Vue starter template files (`DEF-07`), added `<html lang="en">`, stopped polling on terminal order statuses, and added the live `Time Elapsed` pill to `OrderStatusView.vue` with unit tests (`OrderStatusView.spec.ts`).
- **Selective `api-integration` merge, test isolation, and stock-deduction hardening:** Merged only the live menu/product API feature onto `main` (excluding committed `.env.local` credentials and `.gitignore` weakening from `620d7d4`, and omitting redundant `supabase-stock-deduction.sql`). Added `VITE_SUPABASE_*` overrides in `vitest.config.ts` so unit tests never accidentally hit a live Supabase database when a local `.env.local` exists, tightened `create_kiosk_order` and `staff_update_order_status` stock locking/deduction and `public.products` Realtime publication, wired error-banner handling in `StaffQueueView.vue` / `StaffAvailabilityView.vue`, and fixed all 8 Oxlint errors (`0` remaining).
- **Idempotent checkout and double-tap protection (`8c0bf8f`):** Added client-generated `requestId` deduplication, disabled controls while submission is in flight, and verified with `CheckoutView.spec.ts` and `orders.spec.ts`.
- **Cashier confirmation gate and security hardening (`282d59a`):** Added `Proceed`/`Cancel` payment confirmation before `Start Cooking`, SHA-256 hashed invitation codes, parameterized `SECURITY DEFINER` RPCs with RLS, open-redirect blocking, and 5-failure login throttling, verified by `StaffQueueView.spec.ts`, `staffAuth.spec.ts`, and `security.spec.ts`.
- **Node 26 JSDOM `localStorage` masking (`orders.spec.ts:15`):** Tests explicitly bind JSDOM `localStorage` in `beforeAll` so Vitest runs cleanly even when Node's experimental `--localstorage-file` warning appears.

## 4. Final quality assessment

- **Functional correctness:** Strong for the documented scope. All **67 automated Vitest unit and component tests across 17 test files pass**, covering the 57-item menu catalog and SQL seed integrity, live customer product fetching and menu states, checkout idempotency and storage recovery, customer order status/QR/elapsed timer, staff authentication, queue lifecycle and confirmation-error alerts, inventory availability, sales records, CSV export, and account management.
- **Security posture:** Well engineered for a student project. Inputs are validated at boundaries, `.env.local` stays untracked and isolated from unit tests, production builds fail closed without Supabase, SQL queries run through parameterized RPCs with RLS, row locking, and duplicate-item rejection, invitation codes are SHA-256 hashed, restored avatar URLs are sanitized, login attempts throttle after 5 failures, and CSV exports escape formula prefixes.
- **Build and maintainability:** TypeScript type checking, Oxlint (`0` errors across 58 files), ESLint (`0` errors), and both isolated Vite production builds (`dist/` and `dist-staff/`) pass cleanly with starter scaffold files removed (`DEF-07`). Remaining low-priority items are hero image compression (`DEF-06`) and running Playwright E2E once Chromium is installed (`DEF-05`).
- **Release readiness verdict:** **Ready for local and Supabase-backed school demonstration.** Before a live café production launch, apply updated `docs/supabase-staff-schema.sql` and `docs/supabase-menu-seed.sql` to the target Supabase project and run `npx playwright install` to verify all 7 Playwright E2E tests pass.
