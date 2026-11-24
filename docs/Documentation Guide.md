# BnB-Kiosk

BnB-Kiosk is a school project for Bake'n Brew: a self-service food-ordering kiosk with a staff portal for managing orders, menu availability, and sales records. The interface follows the Figma designs exported into the `ordering system/` folder.

The project uses Vue 3, TypeScript, Vite, Pinia, and Vue Router. Supabase provides the configured backend for authentication, products, and orders. A development-only local preview lets the kiosk and staff portal share orders in two tabs on one computer without a database.

## Features

### Customer kiosk

- Choose dine-in or take-out and browse menu categories with photos and prices.
- Add items, review quantities, remove items, and see updated totals.
- Choose Cash or E-wallet and submit the order for staff confirmation.
- Receive a queue number and a tracking QR/link after staff acceptance.
- View order progress and return the kiosk to the welcome screen using Done.

### Staff portal

- Register with an invitation code, sign in, and sign out.
- Review incoming orders and accept or cancel them.
- Manage Waiting, Cooking, and Ready orders, with queue numbers and elapsed times.
- Adjust product stock quantities and availability in the staff inventory page.
- View completed-order records, sales summaries, filters, and CSV exports.
- Update profile details, an avatar, and the account password.

The current order lifecycle is:

```text
pending -> confirmed -> cooking -> ready -> completed
pending -> rejected
```

The staff Waiting tab includes both pending and confirmed orders. Pending orders show a payment/receipt check with Proceed and Cancel actions. Proceed accepts the order; the subsequent actions are Start Cooking, Mark Ready, and Mark Served. Selecting Cash or E-wallet does not itself process a payment.

## Requirements

- Node.js **24.12.0 or newer**, or **22.18.0 or newer within the 22.x release line**, matching `package.json`.
- npm, included with the standard [Node.js installer](https://nodejs.org/en/download).
- [Git](https://git-scm.com/downloads) to clone the repository and manage branches.
- A modern browser. VS Code with Vue (Official) is the recommended editor setup; additional extension recommendations are in [.vscode/extensions.json](../.vscode/extensions.json).

Check your tools in a terminal:

```sh
node --version
npm --version
git --version
```

## Installation

For a new checkout:

```sh
git clone https://github.com/asmallick-gif/BnB-Kiosk.git
cd BnB-Kiosk
npm ci
```

If you already have the project, open its folder in VS Code, choose Terminal > New Terminal, and run only `npm ci`. This installs the versions recorded in `package-lock.json`.

## Run the simple local demo

For the local preview, leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` unset or blank. Configuring both switches the application to Supabase instead of the local preview.

Start the kiosk development server and keep the terminal running:

```sh
npm run dev -- --port 5173 --strictPort
```

Open these pages in **two tabs of the same browser profile**:

| Page                                            | Address                                |
| ----------------------------------------------- | -------------------------------------- |
| Customer kiosk                                  | <http://localhost:5173/>               |
| Staff registration, for the first local account | <http://localhost:5173/staff/register> |
| Staff login                                     | <http://localhost:5173/staff/login>    |
| Staff order queue                               | <http://localhost:5173/staff/queue>    |

Staff pages require sign-in. Create a local demo account through the registration page using the development invitation code `BNB-5JSN-SYN3`, unless `VITE_STAFF_DEV_INVITE_CODE` has been overridden. The local account password must contain 8-128 characters, including at least one letter and one number. Local demo registration does not require email verification.

For a complete demonstration:

1. Register or sign in on the staff tab and open Orders.
2. On the kiosk tab, choose dine-in or take-out, add items, and open View my order.
3. Select Proceed to Checkout, choose Cash or E-wallet, and select Confirm Order.
4. The kiosk displays Waiting for confirmation/payment. The order appears in the staff Waiting tab.
5. For the demonstration, select Proceed on the staff order card to simulate the cashier's payment/receipt check. Cancel instead rejects the order.
6. The kiosk displays the queue number and tracking QR. Open the tracking link in the same browser to view progress without a phone.
7. On the staff tab, use Start Cooking, Mark Ready, and Mark Served. Completed orders contribute to the Records page.

Use the **same hostname and port** for both tabs. For example, `localhost:5173`, `127.0.0.1:5173`, and `localhost:5174` each have separate browser storage. If your existing server uses a different address, use that address for both the kiosk and `/staff/login`.

Press Ctrl+C in the server terminal to stop the demo. Saved local preview data remains in that browser until its site storage is cleared.

## Connect Supabase or run the standalone staff app

Supabase setup is optional for the same-computer development demo. To use the configured backend:

1. Follow [Staff backend setup](staff-backend-setup.md) and apply [the database schema](supabase-staff-schema.sql) to the intended Supabase project.
2. Run [the menu seed script](supabase-menu-seed.sql) in SQL Editor to populate `public.products` with the 57 catalog entries matching `src/data/menu.ts`.
3. Create `.env.local` in the project root using [.env.example](../.env.example):

   ```dotenv
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Restart the development server. Supabase staff accounts and invitation codes are separate from local preview accounts.

Keep `.env.local` out of Git; it is already ignored. Use the publishable client key, not a server-side service-role key. The backend functions and access policies must be configured for authentication, order submission, and staff updates to work.

The standalone staff app can be launched in a second terminal:

```sh
npm run dev:staff
```

Its default address is <http://localhost:5174/login>, with registration at `/register` and signed-in pages at `/queue`, `/availability`, `/records`, and `/account`.

**Use the same-origin `/staff/*` pages for the local-only demo.** The standalone app uses a different port and cannot share the kiosk's local browser storage. Separate kiosk and staff addresses need the same configured Supabase backend to share orders.

## Build and check the project

| Command                      | Purpose                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `npm run type-check`         | Check TypeScript and Vue types.                                           |
| `npm run build`              | Type-check and build the customer kiosk into `dist/`.                     |
| `npm run build:staff`        | Type-check and build the standalone staff portal into `dist-staff/`.      |
| `npm run preview`            | Serve the built kiosk, normally on port 4173.                             |
| `npm run preview:staff`      | Serve the built staff portal on port 4174.                                |
| `npm run test:unit -- --run` | Run the Vitest tests once.                                                |
| `npm run lint`               | Run Oxlint and ESLint with automatic fixes; this can change source files. |
| `npm run format`             | Format files under `src/`; this can change source files.                  |

Install the Playwright browsers before running the browser tests:

```sh
npx playwright install
npm run test:e2e
```

To run only Chromium:

```sh
npm run test:e2e -- --project=chromium
```

The Playwright configuration starts or reuses the kiosk at port 5173 for local tests. Tests cover the order-confirmation flow, including waiting across a reload and a separate staff actor changing order status. Record the actual results when preparing the test report; these commands are not a claim that every test currently passes.

Production builds do not enable the local order or staff-authentication demo. A production preview needs the configured backend for those features. Production hosting also needs an SPA fallback to `index.html` so direct links and refreshed routes load correctly.

## Project structure

```text
src/
  assets/       Images, logos, and shared styles
  components/   Reusable customer and staff interface components
  data/         Local menu catalog and promotion data
  lib/          Supabase client and validation helpers
  router/       Customer and staff routes and staff sign-in guards
  services/     Order, authentication, inventory, and records operations
  stores/       Shared application state managed with Pinia
  views/        Customer screens, staff screens, and component tests
public/menu/    Menu photos served by the app
docs/           Existing integration notes and database setup
e2e/            Playwright browser tests
ordering system/  Exported Figma reference images
```

## Existing technical documentation

- [API Documentation](<API Documentation.md>): Supabase REST, RPC, Auth, Realtime endpoints, error mapping, and sample requests.
- [Staff backend setup](staff-backend-setup.md): local and separate-app modes, Supabase setup, and deployment notes.
- [Supabase staff schema](supabase-staff-schema.sql): database tables, functions, stock deduction, Realtime publication, and access policies.
- [Supabase menu seed](supabase-menu-seed.sql): idempotent SQL seed for the 57 menu items in `public.products`.

These notes describe the intended setup and integration. A database script in the repository does not establish that it has been applied to a running Supabase project.

## Current limitations

- Local preview accounts, orders, and inventory overrides are stored in the current browser. They are not shared with another computer, phone, browser profile, or origin.
- With Supabase configured, the kiosk loads live menu prices, availability, and stock limits from `public.products` on mount or retry (it does not push live Realtime updates onto an already-open kiosk menu screen). In unconfigured local dev preview, the kiosk uses the static sample menu in `src/data/menu.ts` separately from `bnb.demo-products`.
- Cash/E-wallet is a payment-method choice. GCash/Maya payment processing and automatic payment verification are not implemented.
- The tracking QR opens an order-status URL, not a payment page. A localhost QR does not provide phone access to this local demo.
- Local preview stock starts with sample quantities, and the feedback button directs customers to the team rather than saving a feedback form.
- The package version is currently `0.0.0`; a final release number has not yet been assigned.

## Troubleshooting

| Problem                                        | What to check                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `node` or `npm` is not recognized              | Install a supported Node.js version with npm, then restart VS Code and open a new terminal.                                     |
| PowerShell blocks `npm.ps1`                    | Use `npm.cmd` in place of `npm`, for example `npm.cmd ci` or `npm.cmd run dev`.                                                 |
| Port 5173 is already in use                    | Use the existing demo or stop its terminal. Alternatively, choose another port and use the same new address for both tabs.      |
| An order stays pending                         | Open the staff queue at the same origin and select Proceed after the demonstration payment/receipt check.                       |
| Kiosk orders do not appear for staff           | Check that both tabs use the same browser profile, hostname, and port. Separate ports need Supabase.                            |
| Requests fail after setting Supabase variables | Check the project URL/key, database schema, product seed data, and staff setup guide. Restart Vite after configuration changes. |
