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

### Option B: Same-Origin Preview (before Supabase is configured)
When `.env.local` does not set Supabase keys, Vite dev mode uses `localStorage` for local preview orders. Because `localStorage` is scoped per origin (port), `npm run dev` also mounts the staff portal at `/staff/*` **in dev mode only**:
- Tab 1 (Kiosk): `http://localhost:5173/`
- Tab 2 (Staff): `http://localhost:5173/staff/login`

Any order submitted in Tab 1 appears in Tab 2's Queue so you can test `pending → confirmed → QR tracking` end-to-end without a live database.

## Production Builds & Separate URLs

| Target | Build command | Output folder | Routes included |
| --- | --- | --- | --- |
| Customer Kiosk | `npm run build` | `dist/` | `/`, `/menu`, `/order/:token` (zero staff code) |
| Staff Portal | `npm run build:staff` | `dist-staff/` | `/login`, `/register`, `/queue`, `/availability`, `/records` |

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
2. Seed an initial employee invitation code:
   ```sql
   insert into public.staff_invitations (code, role, max_uses)
   values ('BNB-STAFF-2026', 'staff', 10);
   ```
3. Seed the `public.products` table with your menu catalog IDs and prices from `src/data/menu.ts`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env.local`.
