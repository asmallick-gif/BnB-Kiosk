# Known issues and engineering audit log

This document tracks verified defects, catalog discrepancies, security notes, and technical debt discovered during development and code review. Each open item corresponds to a scoped GitHub Issue for follow-up.

## Open issues

### ISSUE-01: Price mismatch between Best Sellers and category menu entries
- Status: Open (needs cafe owner confirmation)
- Severity: Medium
- Area: Menu catalog (`src/data/menu.ts`, `docs/supabase-staff-schema.sql`)
- Details: Two items appear in both `best-sellers` and their dedicated Figma category menus with different prices:
  - `best-sellers-2` (`Iced Latte`) is 170 PHP, while `iced-coffee-2` (`Iced Latte`) is 190 PHP.
  - `best-sellers-5` (`Biscoff Matcha`) is 180 PHP, while `matcha-series-4` (`Biscoff Matcha`) is 170 PHP.
- Current mitigation: Original `best-sellers` IDs, prices, and image paths were left untouched to preserve existing assumptions and tests.
- Resolution criteria: Confirm canonical pricing with the business owner, align `src/data/menu.ts` and `docs/supabase-staff-schema.sql`, and update `src/data/__tests__/menu.spec.ts`.

### ISSUE-02: Unused `supabase` import fails `oxlint` in `src/services/products.ts`
- Status: Open
- Severity: Low
- Area: Linting (`src/services/products.ts`)
- Details: Line 1 imports `supabase` without referencing it, causing `npm run lint` (`oxlint`) to exit with code 1.
- Resolution criteria: Either wire `src/services/products.ts` to query `public.products` through `supabase` or remove the unused import and verify `npm run lint` exits cleanly.

### ISSUE-03: Full-resolution PNG menu images increase kiosk payload size
- Status: Open
- Severity: Medium
- Area: Performance (`public/menu/`)
- Details: The 30 newly added Figma product images average 1.7 to 2.1 MB each as PNG files, totaling roughly 58 MB on disk.
- Resolution criteria: Batch-convert `public/menu/*.png` to compressed WebP (target under 150 KB per image), update paths in `src/data/menu.ts`, and confirm `src/data/__tests__/menu.spec.ts` passes.

### ISSUE-04: E-wallet checkout requires manual cashier verification
- Status: Open (planned enhancement)
- Severity: Low (by design for V1)
- Area: Payments (`src/views/CheckoutView.vue`, `docs/kiosk-order-integration.md`)
- Details: Selecting E-wallet records payment intent for GCash/Maya at the counter and does not settle payment electronically.
- Resolution criteria: Integrate a payment gateway webhook (such as PayMongo) to confirm paid e-wallet orders automatically while retaining manual confirmation for cash.

### ISSUE-05: Manual SQL execution instead of versioned Supabase CLI migrations
- Status: Open
- Severity: Low
- Area: Database operations (`docs/supabase-staff-schema.sql`)
- Details: Schema updates and product seeds are currently applied by pasting `docs/supabase-staff-schema.sql` into the Supabase SQL Editor.
- Resolution criteria: Split schema and seed changes into timestamped `supabase/migrations/` files and verify repeatable `supabase db push` runs.

## Resolved audit items

### AUDIT-01: Single-row search collision in `StaffAvailabilityView.spec.ts`
- Status: Resolved in commit `84f341a`
- Details: Adding `iced-coffee` and `matcha-series` introduced second entries for `Spanish Latte` and `Biscoff Matcha`, breaking a unit test that expected one matching row.
- Fix: Updated the test filter to `Beef Nachos` (unique to `starter`) and verified all 15 test files / 39 unit tests pass.

### AUDIT-02: `vitest.config.ts` failed to merge callback-style `vite.config.ts`
- Status: Resolved in commit `69842c0`
- Details: Exporting a function from `vite.config.ts` broke `mergeConfig` inside `vitest.config.ts`.
- Fix: Refactored `vite.config.ts` to export a plain `defineConfig({ ... })` object and moved `--mode staff` detection into `appTargetPlugin.config()`.

### AUDIT-03: Staff authentication and SQL injection hardening
- Status: Resolved in commit `282d59a`
- Details: Eliminated direct table access for anonymous clients, locked `search_path` on all `SECURITY DEFINER` RPCs, hashed invitation codes with SHA-256, and added input allowlists plus open-redirect checks in `src/lib/security.ts`.
