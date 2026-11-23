# BnB-Kiosk Testing and Quality Report

Bake'n Brew customer kiosk and staff portal  
Branch: `docs` (`18ac49e` base) · Executed: 2026-11-23

This report records the test cases, expected and actual results, pass/fail status, known defects, applied and recommended fixes, and overall quality assessment for BnB-Kiosk based on live automated checks run against the repository. It complements the [Software Requirements Specification](<Software Requirements Specification.md>) and [Technical Design](<Technical Design.md>).

## Contents

- [1. Test environment and execution summary](#1-test-environment-and-execution-summary)
- [2. Detailed test cases](#2-detailed-test-cases)
- [3. Known defects and fixes](#3-known-defects-and-fixes)
- [4. Final quality assessment](#4-final-quality-assessment)

## 1. Test environment and execution summary

**Environment:** Windows, Node.js `v26.13.0`, npm `11.20.0`, Vitest `4.1.12` (with JSDOM), Vite `8.3.8`, Vue `3.5.45`, Playwright `1.65.1`, local preview mode (no `.env.local` Supabase credentials configured).

| Quality gate | Command executed | Result | Summary |
| --- | --- | --- | --- |
| Unit and component tests | `npm run test:unit -- --run --reporter=verbose` | Pass | 14 of 14 test files passed; 37 of 37 tests passed in 14.68s |
| TypeScript / Vue type check | `npm run type-check` (`vue-tsc --build`) | Pass | Exit code `0`, zero type errors |
| ESLint | `npx eslint .` | Pass | Exit code `0`, zero errors or warnings |
| Oxlint | `npx oxlint .` | Fail | Exit code `1`, 3 errors and 0 warnings across 64 files (144 rules) |
| Customer kiosk build | `npm run build` | Pass | Exit code `0`, 118 modules built into `dist/` in 759ms (zero staff chunks) |
| Standalone staff build | `npm run build:staff` | Pass | Exit code `0`, 135 modules built into `dist-staff/` in 1.26s |
| End-to-end browser tests | `npm run test:e2e -- --project=chromium` | Blocked | 7 of 7 tests failed at browser launch because Chromium binary (`chromium-1255`) is not installed (`npx playwright install` required) |
| Dependency audit | `npm ci` audit summary | Warning | 5 moderate severity vulnerabilities reported in the npm dependency tree |

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
| TC-04 | Click `Cancel` on `#002`, then click `Proceed` and `Start Cooking` on `#001` | `#002` rejected; `#001` confirmed -> cooking | `#002` removed with toast; `#001` unlocks `Start Cooking` and moves to `COOKING` tab showing `Mark Ready` | Toasts matched (`Order Cancelled`, `Payment Confirmed`, `Started Cooking`); `#001` appeared under `COOKING` with `Mark Ready` | Pass | Verified in 179ms |
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
| TC-08 | Run `npx oxlint .` (read-only) | 64 files, 144 rules | Exit code `0` with zero errors | Exit code `1`: 3 errors (`no-extra-boolean-cast`, `no-unused-vars`, `no-control-regex`) | Fail | Logged as `DEF-01`, `DEF-02`, `DEF-03` |
| TC-08 | Run `npm run build` and `npm run build:staff` | Production Vite modes | Both succeed; `dist/` excludes all staff views | `dist/` built in 759ms (zero staff chunks); `dist-staff/` built in 1.26s | Pass | Bundle isolation verified |

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

## 3. Known defects and fixes

### 3.1 Open defects and technical gaps observed on the `docs` branch

| ID | Severity | Location | Observed defect | Status | Recommended or in-progress fix |
| --- | --- | --- | --- | --- | --- |
| DEF-01 | Low | `src/services/staffProducts.ts:94` | Oxlint `no-extra-boolean-cast` error on `Boolean(row.available) ? 10 : 0` | Open | Replace with `row.available ? 10 : 0`. |
| DEF-02 | Low | `src/services/products.ts:1` | Oxlint `no-unused-vars` error: unused 1-line file importing `supabase` | Open | Remove unused stub file or implement shared product fetching on `api-integration`. |
| DEF-03 | Low | `src/lib/security.ts:5` | Oxlint `no-control-regex` error on intentional ASCII control-character sanitizer `/[\u0000-\u001F\u007F]/g` | Open | Add an explicit inline disable comment explaining why control-character stripping is required, or filter via `charCodeAt`. |
| DEF-04 | Medium | `src/views/MenuView.vue`, `src/data/menu.ts` | Customer kiosk menu reads static `menu.ts`, so staff availability edits on `/availability` do not hide unavailable items on the kiosk | In progress (`origin/api-integration`) | Merge the `api-integration` branch (`47063ac`, `67b5f52`), which connects menu/products to Supabase and deducts stock on acceptance. |
| DEF-05 | Medium | `e2e/` test runner | Playwright E2E suite could not run in this checkout because browser binaries were not downloaded | Blocked (env) | Run `npx playwright install` and re-run `npm run test:e2e -- --project=chromium`, then record green output before final submission. |
| DEF-06 | Low | `src/assets/staff/staff-hero.png`, `src/assets/images/welcome-background.jpg` | Large unoptimized images shipped in production bundles (`2.61 MB` PNG and `1.01 MB` JPEG) | Open | Convert and compress hero assets to WebP (target under 250 KB each) to speed up kiosk and staff first paint. |
| DEF-07 | Low | `src/components/HelloWorld.vue`, `TheWelcome.vue`, `src/views/AboutView.vue`, `src/stores/counter.ts` | Unused Vue starter template files remain in `src/` and `AboutView` is still bundled into `dist/` | Open | Remove starter scaffold files, `/about` route, and `HelloWorld.spec.ts` once confirmed unneeded. |
| DEF-08 | Low | `src/views/OrderStatusView.vue`, `src/components/staff/StaffOrderCard.vue` | No Vitest unit spec covers `OrderStatusView.vue` polling/QR fallback directly (covered only in E2E); item preparation checkboxes reset on page reload | Open | Add a Vitest spec for `OrderStatusView.vue` (polling retry, rejected screen, QR error fallback); decide if item checkboxes should persist in session state. |
| DEF-09 | Low | `package-lock.json` | `npm ci` reported 5 moderate severity dependency advisories | Open | Run `npm audit` to inspect whether advisories affect runtime dependencies or dev tooling only, and upgrade affected packages individually. |

### 3.2 Historical fixes verified in the repository

- **Idempotent checkout and double-tap protection (`8c0bf8f`):** Added client-generated `requestId` deduplication, disabled controls while submission is in flight, and verified with `CheckoutView.spec.ts` and `orders.spec.ts`.
- **Cashier confirmation gate and security hardening (`282d59a`):** Added `Proceed`/`Cancel` payment confirmation before `Start Cooking`, SHA-256 hashed invitation codes, parameterized `SECURITY DEFINER` RPCs with RLS, open-redirect blocking, and 5-failure login throttling, verified by `StaffQueueView.spec.ts`, `staffAuth.spec.ts`, and `security.spec.ts`.
- **Node 26 JSDOM `localStorage` masking (`orders.spec.ts:15`):** Tests explicitly bind JSDOM `localStorage` in `beforeAll` so Vitest runs cleanly even when Node's experimental `--localstorage-file` warning appears.

## 4. Final quality assessment

- **Functional correctness:** Strong for the documented scope. All 37 automated Vitest unit and component tests pass across customer menu/checkout, staff authentication, queue lifecycle, inventory availability, sales records, CSV export, and account management.
- **Security posture:** Well engineered for a student project. Inputs are validated at boundaries, credentials stay out of Git, production builds fail closed without Supabase, SQL queries run through parameterized RPCs with RLS, invitation codes are SHA-256 hashed, login attempts throttle after 5 failures, and CSV exports escape formula prefixes.
- **Build and maintainability:** TypeScript type checking, ESLint, and both isolated Vite production builds (`dist/` and `dist-staff/`) pass cleanly. Cleaning up the 3 Oxlint errors (`DEF-01` to `DEF-03`), unused Vue starter files (`DEF-07`), and large hero images (`DEF-06`) will tighten code hygiene and initial load speed.
- **Release readiness verdict:** **Ready for local school demonstration on the `docs` branch.** Before merging into a production café release, resolve the 3 Oxlint errors, run `npx playwright install` and verify all 7 Playwright E2E tests pass, and integrate the live Supabase menu/stock work from `api-integration`.
