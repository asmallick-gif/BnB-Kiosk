# Changelog

All notable user-facing changes to Bake'n Brew Kiosk and Staff Portal are documented in this file.

## [Unreleased]

### Added
- Seven new menu categories with 30 local product photos and matching `public.products` upsert seeds in `docs/supabase-staff-schema.sql`: Burgers, Hot Coffee, Iced Coffee, Hojicha, Baker's Coffee Menu, Non-Coffee (Milk Based), and Matcha Series (catalog now covers 13 categories and 57 items).
- Catalog and database seed integrity tests in `src/data/__tests__/menu.spec.ts`.
- Repository issue templates (`.github/ISSUE_TEMPLATE/`), pull request template (`.github/pull_request_template.md`), known-issues ledger (`docs/known-issues.md`), and recorded demonstration script (`docs/demo-presentation-script.md`).

### Changed
- Updated `StaffAvailabilityView.spec.ts` single-row search assertion to use `Beef Nachos` after `Biscoff Matcha` appeared in both `best-sellers` and `matcha-series`.

## [0.5.0] - Staff portal operations and security

### Added
- Staff My Account page (`/account`) with profile editing, avatar image upload, password updates, and the `staff_update_own_profile` Supabase RPC.
- Staff Order Records page (`/records`) with Today, Week, Month, and All Time filters, sales KPI cards, best-seller tracking, column sorting, and formula-safe CSV export.
- Staff Available inventory page (`/availability`) with stock counters, availability toggles, and the `staff_update_product_availability` RPC.
- Staff Order Queue page (`/queue`) with a Proceed or Cancel payment confirmation dialog before moving pending orders into cooking.
- Standalone Staff Portal build target (`npm run dev:staff`, `npm run build:staff` to `dist-staff/`) using `appTargetPlugin` in `vite.config.ts`, isolated from the public kiosk bundle (`dist/`).
- Invitation-gated staff registration and login (`StaffLoginView.vue`, `StaffRegisterView.vue`) with Pinia auth state and route guards.

### Security
- Added parameterized Supabase RPCs with locked `search_path`, Row Level Security policies, and strict PostgreSQL `CHECK` constraints in `docs/supabase-staff-schema.sql`.
- Stored staff invitation codes exclusively as SHA-256 hashes in `public.staff_invitations`.
- Added client-side input allowlists, open-redirect sanitization, login attempt throttling, and salted SHA-256 local dev credential hashing in `src/lib/security.ts`.

## [0.2.0] - Customer kiosk ordering and QR tracking

### Added
- Customer kiosk checkout (`CheckoutView.vue`) with Dine-in or Take-out selection and Cash or E-wallet payment choice.
- Reload-safe pending payment confirmation screen (`OrderStatusView.vue`) that polls every 2.5 seconds and unlocks generated QR code tracking (`/order/<token>`) only after staff confirmation.
- Dual-backend order adapter in `src/services/orders.ts` supporting Supabase RPCs (`create_kiosk_order`, `get_kiosk_order`) in production and `localStorage` in Vite dev mode.
- Playwright end-to-end test (`e2e/order-confirmation.spec.ts`) covering reload persistence, cross-tab confirmation, QR generation, and 375px mobile layout.
- Initial six menu categories (Best Sellers, Starter, Rice Meals, Pasta, Noodles, Chicken Wings) and promotional banner.
