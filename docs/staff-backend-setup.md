# Staff Portal & Separate URL Architecture

This repository builds **two separate web apps** from one shared codebase so the customer kiosk and the employee backend portal have separate URLs and isolated production bundles while sharing Supabase config, order types, and menu data.

## Local Development

### Option A: Separate Staff URL (recommended once Supabase is connected)
Run the kiosk and staff apps on two different localhost ports:

```sh
# Terminal 1 — Customer Kiosk (http://localhost:5173)
npm run dev

# Terminal 2 — Standalone Staff Portal (http://localhost:5174)
npm run dev:staff
```

In `dev:staff` mode, staff pages are mounted directly at the root:
- `http://localhost:5174/login`
- `http://localhost:5174/register`
- `http://localhost:5174/queue`
- `http://localhost:5174/availability`
- `http://localhost:5174/records`
- `http://localhost:5174/account`

### Option B: Same-Origin Preview (before Supabase is configured)
When `.env.local` does not set Supabase keys, Vite dev mode uses `localStorage` for local preview orders. Because `localStorage` is scoped per origin (port), `npm run dev` also mounts the staff portal at `/staff/*` **in dev mode only**:
- Tab 1 (Kiosk): `http://localhost:5173/`
- Tab 2 (Staff): `http://localhost:5173/staff/login`

Any order submitted in Tab 1 appears in Tab 2's Queue so you can test `pending → confirmed → QR tracking` end-to-end without a live database.

## Production Builds & Separate URLs

| Target | Build command | Output folder | Routes included |
| --- | --- | --- | --- |
| Customer Kiosk | `npm run build` | `dist/` | `/`, `/menu`, `/order/:token` (zero staff code) |
| Staff Portal | `npm run build:staff` | `dist-staff/` | `/login`, `/register`, `/queue`, `/availability`, `/records`, `/account` |

To preview the production staff bundle locally:

```sh
npm run build:staff
npm run preview:staff
```

### Deploying to two URLs (Vercel / Netlify / Cloudflare Pages)
Create two projects connected to this same Git repository, both sharing the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables:
1. **Kiosk site** (e.g. `kiosk.yourdomain.com`): Build command `npm run build`, Output directory `dist`
2. **Staff site** (e.g. `staff.yourdomain.com`): Build command `npm run build:staff`, Output directory `dist-staff`

Configure SPA fallback (`/* → /index.html`) on both sites so direct links like `/order/<token>` and `/login` work on refresh.

## Supabase Backend Setup

1. Open your Supabase project's **SQL Editor** and run `docs/supabase-staff-schema.sql`.
   - This automatically seeds your initial admin invitation code (`BNB-5JSN-SYN3`, hashed with SHA-256 in `public.staff_invitations`, valid for 5 uses / 7 days).
2. To generate new single-use invitation codes for additional employees later, run in SQL Editor (or as an authenticated admin/manager):
   ```sql
   select public.generate_staff_invitation('staff', 1, 72);
   ```
3. Run `docs/supabase-menu-seed.sql` in SQL Editor to seed `public.products` with all 27 menu items matching `src/data/menu.ts` (uses `on conflict (id) do nothing` so existing edits are preserved).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env.local` (keep `.env.local` untracked).

## Security Measures Included

- **SQL Injection Prevention:** All Supabase mutations and order reads use parameterized RPCs (`create_kiosk_order`, `get_kiosk_order`, `staff_list_orders`, `staff_update_order_status`, `staff_update_product_availability`, `staff_update_own_profile`) with zero dynamic SQL concatenation, locked `search_path`, strict PostgreSQL `CHECK` constraints, and frontend allowlist validation (`src/lib/security.ts`, `src/services/products.ts`).
- **Stock & Availability Integrity:** `create_kiosk_order` validates product availability and requested quantity against `public.products`; `staff_update_order_status` locks ordered product rows (`FOR UPDATE`), deducts stock atomically on `confirmed`, rejects insufficient stock, and marks `0`-stock items unavailable.
- **Hashed Invitation Codes:** Raw invitation codes are never stored in `public.staff_invitations`; only SHA-256 digests are persisted, and direct client table access is revoked (`REVOKE ALL` + RLS).
- **Row Level Security & Least Privilege:** Anonymous users cannot list orders, update statuses, or view staff accounts. Only active rows in `public.staff_profiles` can run staff RPCs.
- **Brute-Force & Credential Hygiene:** Login attempts throttle after 5 consecutive failures; local dev preview hashes passwords with per-account salted SHA-256; internal redirects block open-redirect payloads (`//evil.com`, `/\evil.com`).
