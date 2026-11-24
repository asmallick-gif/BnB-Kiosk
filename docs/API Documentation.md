# BnB-Kiosk API Documentation

REST, RPC, Auth, and Realtime API Reference (`v1`)  
Bake'n Brew customer kiosk and staff portal · Reviewed: 2026

## Contents

- [1. API provider and base URLs](#1-api-provider-and-base-urls)
- [2. Authentication and access control](#2-authentication-and-access-control)
- [3. Rate limits and polling intervals](#3-rate-limits-and-polling-intervals)
- [4. Response format and shared schemas](#4-response-format-and-shared-schemas)
- [5. Public kiosk endpoints](#5-public-kiosk-endpoints)
- [6. Staff authentication and account endpoints](#6-staff-authentication-and-account-endpoints)
- [7. Staff orders and inventory endpoints](#7-staff-orders-and-inventory-endpoints)
- [8. Manager and admin invitation endpoints](#8-manager-and-admin-invitation-endpoints)
- [9. Realtime subscriptions](#9-realtime-subscriptions)
- [10. Error handling](#10-error-handling)

## 1. API provider and base URLs

BnB-Kiosk uses **Supabase** as its backend API provider, consumed from the browser via `@supabase/supabase-js` (`^2.119.0`) and configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (see [Staff Backend Setup](staff-backend-setup.md) and [Supabase Staff Schema](supabase-staff-schema.sql)).

| Surface | Base URL | Protocol / Content Type |
| --- | --- | --- |
| PostgREST (Tables and RPCs) | `https://<project-ref>.supabase.co/rest/v1` | HTTPS · `application/json` |
| Supabase Auth (GoTrue) | `https://<project-ref>.supabase.co/auth/v1` | HTTPS · `application/json` |
| Supabase Realtime | `wss://<project-ref>.supabase.co/realtime/v1/websocket` | WebSocket (Phoenix channels) |

When `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is blank during Vite development (`import.meta.env.DEV`), the client services switch to same-origin `localStorage` preview adapters and make no network calls. Production builds disable that fallback.

## 2. Authentication and access control

Every HTTP request to Supabase requires the project publishable key in the `apikey` header. Never put a `service_role` key in frontend code or `.env.local`.

| Access level | Required headers | Enforced by |
| --- | --- | --- |
| Public kiosk (`anon`) | `apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>`<br>`Authorization: Bearer <VITE_SUPABASE_PUBLISHABLE_KEY>` | `GRANT EXECUTE` on `create_kiosk_order` and `get_kiosk_order`; `public read products` RLS policy |
| Active staff (`authenticated`) | `apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>`<br>`Authorization: Bearer <user_jwt>` | Valid Supabase Auth JWT + `public.is_active_staff()` (`staff_profiles.active = true`) |
| Manager / Admin (`authenticated`) | `apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>`<br>`Authorization: Bearer <user_jwt>` | Valid Supabase Auth JWT + `public.is_active_admin()` (`role in ('admin', 'manager')` and `active = true`) |

Direct table access to `staff_invitations`, `staff_profiles`, `products`, `orders`, and `order_items` is revoked from `public`, `anon`, and `authenticated` before minimal column-scoped grants and RLS policies are applied. Anonymous callers cannot list orders, inspect staff records, or update order statuses.

## 3. Rate limits and polling intervals

| Scope | Limit or interval | Enforcement point |
| --- | --- | --- |
| Customer menu catalog fetch | **10-second request timeout** per fetch (`AbortController`) on mount or `Try again` | `listMenuProducts()` in `src/services/products.ts` |
| Staff login attempts | Max **5 consecutive failures** per normalized email, followed by a **60-second lockout** | Client-side `createAttemptThrottle(5, 60_000)` in `src/lib/security.ts` |
| Customer order tracking poll | **1 request every 2.5 seconds** (24 req/min per open active tracker), serialized with an in-flight `refreshing` lock; stops automatically on `completed` or `rejected` | `src/views/OrderStatusView.vue` |
| Order creation deduplication | Duplicate submissions sharing a `requestId` UUID return the existing order without inserting | `public.orders(request_id)` `UNIQUE` constraint + `create_kiosk_order` |
| Supabase Auth and API quotas | Project-tier limits on signup, login, recovery emails, REST throughput, and Realtime channels | Managed by Supabase Auth / API gateway (configurable in Supabase Dashboard; returns HTTP `429`) |

## 4. Response format and shared schemas

All REST and RPC endpoints return `application/json`.

### `KioskOrder` object

Returned by `create_kiosk_order`, `get_kiosk_order`, `staff_list_orders` (as an array), and `staff_update_order_status`:

```json
{
  "token": "6b2f6c1e-7a2d-4c8d-a2b4-41d5c2f91e04",
  "requestId": "c82b1d20-5c23-4ef8-b94a-78fa1e0f41b9",
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
  "createdAt": "2026-11-23T09:00:00Z"
}
```

Valid `status` values: `pending`, `confirmed`, `cooking`, `ready`, `completed`, `rejected`.

## 5. Public kiosk endpoints

### `POST` `/rest/v1/rpc/create_kiosk_order`

Validates menu items, availability (`available = true`), stock (`stock_quantity >= quantity`), and prices against `public.products`, calculates totals server-side, assigns a queue number, and stores a `pending` order. Retries with the same `requestId` return the existing order.

**Request URL**

```text
https://<project-ref>.supabase.co/rest/v1/rpc/create_kiosk_order
```

**Authentication:** `anon` or `authenticated`

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `p_request` | required | Order payload containing `requestId` (UUID), `orderType` (`Dine-in` or `Take-out`), `paymentMethod` (`cash` or `e-wallet`), and `items` (1 to 50 items, each `quantity` 1 to 99). | `object` | `body` | See sample below |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Order created (or existing order returned for repeated `requestId`) | `KioskOrder` (`object`) | `{ "token": "...", "queueNumber": 8, "status": "pending", "total": 180, ... }` |
| `400` | Validation failed (`Invalid order request.`, `Invalid item quantity.`, or `Item unavailable.`) | `Error` (`object`) | `{ "code": "P0001", "message": "Item unavailable." }` |

**Sample request**

```bash
curl -X POST "https://<project-ref>.supabase.co/rest/v1/rpc/create_kiosk_order" \
  -H "apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>" \
  -H "Authorization: Bearer <VITE_SUPABASE_PUBLISHABLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_request": {
      "requestId": "c82b1d20-5c23-4ef8-b94a-78fa1e0f41b9",
      "orderType": "Take-out",
      "paymentMethod": "e-wallet",
      "items": [{ "id": "best-sellers-1", "quantity": 2 }]
    }
  }'
```

```ts
const { data, error } = await supabase.rpc('create_kiosk_order', { p_request: request })
```

### `POST` `/rest/v1/rpc/get_kiosk_order`

Returns public status and receipt details for one order identified by its unguessable server-generated UUID `token`. Returns `null` if no matching order exists.

**Request URL**

```text
https://<project-ref>.supabase.co/rest/v1/rpc/get_kiosk_order
```

**Authentication:** `anon` or `authenticated`

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `p_token` | required | Server-generated UUID token from the tracking URL `/order/<token>`. | `string (uuid)` | `body` | `"6b2f6c1e-7a2d-4c8d-a2b4-41d5c2f91e04"` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Matching order found, or `null` if not found | `KioskOrder \| null` | `{ "token": "6b2f...", "queueNumber": 8, "status": "confirmed", ... }` |
| `400` | Malformed UUID syntax | `Error` (`object`) | `{ "code": "22P02", "message": "invalid input syntax for type uuid" }` |

**Sample request**

```bash
curl -X POST "https://<project-ref>.supabase.co/rest/v1/rpc/get_kiosk_order" \
  -H "apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>" \
  -H "Authorization: Bearer <VITE_SUPABASE_PUBLISHABLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "p_token": "6b2f6c1e-7a2d-4c8d-a2b4-41d5c2f91e04" }'
```

```ts
const { data, error } = await supabase.rpc('get_kiosk_order', { p_token: token })
```

## 6. Staff authentication and account endpoints

### `POST` `/auth/v1/signup`

Creates a Supabase Auth user and fires the `on_auth_user_created_staff` PostgreSQL trigger, which hashes `invitation_code` with SHA-256, verifies active/unexpired/available uses in `public.staff_invitations`, increments `uses_count`, and inserts a `public.staff_profiles` row.

**Request URL**

```text
https://<project-ref>.supabase.co/auth/v1/signup
```

**Authentication:** `anon` (invitation code required inside user metadata)

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `email` | required | Work email (max 254 chars). | `string` | `body` | `"staff@bakenbrew.local"` |
| `password` | required | 8 to 128 chars with at least one letter and one number. | `string` | `body` | `"BrewPass123"` |
| `data` | required | Metadata object containing `full_name` (2 to 80 chars), `first_name`, `last_name`, `middle_initial`, and `invitation_code` (`^[A-Z0-9-]{6,32}$`). | `object` | `body` | `{ "full_name": "Ana Cruz", "invitation_code": "BNB-5JSN-SYN3" }` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Account created (returns `user` and optional `session` if email confirmation is disabled) | `object` | `{ "user": { "id": "...", "email": "staff@bakenbrew.local" }, "session": null }` |
| `400` / `422` | Invalid or expired invitation code, weak password, or duplicate email | `Error` (`object`) | `{ "code": 400, "msg": "Invalid or expired staff invitation code." }` |

**Sample request**

```bash
curl -X POST "https://<project-ref>.supabase.co/auth/v1/signup" \
  -H "apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@bakenbrew.local",
    "password": "BrewPass123",
    "data": {
      "full_name": "Ana Cruz",
      "first_name": "Ana",
      "last_name": "Cruz",
      "middle_initial": "",
      "invitation_code": "BNB-5JSN-SYN3"
    }
  }'
```

### `POST` `/auth/v1/token?grant_type=password`

Authenticates an existing staff member and returns an access JWT and refresh token. Protected on the client by `createAttemptThrottle(5, 60_000)`.

**Request URL**

```text
https://<project-ref>.supabase.co/auth/v1/token?grant_type=password
```

**Authentication:** `anon`

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `grant_type` | required | Must be `password`. | `string` | `query` | `"password"` |
| `email` | required | Registered work email address. | `string` | `body` | `"staff@bakenbrew.local"` |
| `password` | required | Account password (max 128 chars). | `string` | `body` | `"BrewPass123"` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Sign-in succeeded; returns JWT `access_token`, `refresh_token`, and `user` | `object` | `{ "access_token": "eyJ...", "token_type": "bearer", "expires_in": 3600, "user": { ... } }` |
| `400` | Invalid credentials (mapped on client to `Invalid email address or password.`) | `Error` (`object`) | `{ "error_code": "invalid_credentials", "msg": "Invalid login credentials" }` |
| `429` | Rate limit exceeded | `Error` (`object`) | `{ "error_code": "over_request_rate_limit", "msg": "Request rate limit reached" }` |

**Sample request**

```bash
curl -X POST "https://<project-ref>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{ "email": "staff@bakenbrew.local", "password": "BrewPass123" }'
```

### `POST` `/auth/v1/logout`

Invalidates the current staff session token (`supabase.auth.signOut()`).

**Request URL**

```text
https://<project-ref>.supabase.co/auth/v1/logout
```

**Authentication:** `authenticated` (`Authorization: Bearer <user_jwt>`)

**Responses**

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `204` | Session terminated | empty | *(no body)* |
| `401` | Missing or invalid bearer token | `Error` (`object`) | `{ "code": 401, "msg": "Invalid JWT" }` |

### `POST` `/auth/v1/recover`

Triggers a Supabase Auth password reset email redirecting back to `<origin>/login` (`supabase.auth.resetPasswordForEmail`).

**Request URL**

```text
https://<project-ref>.supabase.co/auth/v1/recover
```

**Authentication:** `anon`

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `email` | required | Registered staff email address. | `string` | `body` | `"staff@bakenbrew.local"` |
| `redirect_to` | optional | Return URL after reset (client sends `${window.location.origin}/login`). | `string (url)` | `query` | `"https://staff.example.com/login"` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Recovery email queued | `object` | `{}` |
| `429` | Email recovery rate limit reached | `Error` (`object`) | `{ "error_code": "over_email_send_rate_limit", "msg": "For security purposes..." }` |

### `PUT` `/auth/v1/user`

Updates the signed-in user's Auth email, profile metadata, or password (`supabase.auth.updateUser`). Called by `updateStaffProfile` and `updateStaffPassword` in `src/services/staffAuth.ts`.

**Request URL**

```text
https://<project-ref>.supabase.co/auth/v1/user
```

**Authentication:** `authenticated`

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `email` | optional | Updated work email address. | `string` | `body` | `"ana.cruz@bakenbrew.local"` |
| `password` | optional | New password (8 to 128 chars, letter + number). | `string` | `body` | `"NewBrewPass9"` |
| `data` | optional | User metadata (`full_name`, `first_name`, `last_name`, `middle_initial`, `home_address`, `avatar_url`). | `object` | `body` | `{ "first_name": "Ana", "last_name": "Cruz" }` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Auth user updated | `object` | `{ "id": "...", "email": "ana.cruz@bakenbrew.local", "user_metadata": { ... } }` |
| `401` / `422` | Expired session or invalid payload | `Error` (`object`) | `{ "code": 422, "msg": "New password should be different from the old password." }` |

### `POST` `/rest/v1/rpc/staff_update_own_profile`

Syncs the signed-in staff member's profile record in `public.staff_profiles` right after `PUT /auth/v1/user`.

**Request URL**

```text
https://<project-ref>.supabase.co/rest/v1/rpc/staff_update_own_profile
```

**Authentication:** `authenticated` (active staff)

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `p_first_name` | required | First name (1 to 40 chars). | `string` | `body` | `"Ana"` |
| `p_last_name` | required | Last name (1 to 40 chars). | `string` | `body` | `"Cruz"` |
| `p_middle_initial` | optional | 1 to 2 letters; defaults to `""`. | `string` | `body` | `"M"` |
| `p_home_address` | optional | Max 200 chars; defaults to `""`. | `string` | `body` | `"123 Brew St."` |
| `p_avatar_url` | optional | HTTPS URL or base64 PNG/JPEG/WebP data URL (`<= 2,900,000` chars, roughly 2 MB source image). | `string` | `body` | `"data:image/webp;base64,..."` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Updated profile object | `object` | `{ "id": "...", "email": "...", "fullName": "Ana M. Cruz", "role": "staff", ... }` |
| `400` | Validation or authorization failure (`Unauthorized: active staff account required.`, `Avatar image is too large.`) | `Error` (`object`) | `{ "code": "P0001", "message": "Please provide a valid first and last name." }` |

## 7. Staff orders and inventory endpoints

### `POST` `/rest/v1/rpc/staff_list_orders`

Returns all orders serialized as `KioskOrder[]`, sorted newest first (`created_at desc`).

**Request URL**

```text
https://<project-ref>.supabase.co/rest/v1/rpc/staff_list_orders
```

**Authentication:** `authenticated` (active staff)

**Parameters:** None (empty JSON body `{}`).

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Array of serialized orders (empty `[]` when none exist) | `KioskOrder[]` (`array`) | `[ { "token": "...", "queueNumber": 8, "status": "pending", ... } ]` |
| `400` / `401` | Inactive or unauthenticated user | `Error` (`object`) | `{ "code": "P0001", "message": "Unauthorized: active staff account required." }` |

**Sample request**

```bash
curl -X POST "https://<project-ref>.supabase.co/rest/v1/rpc/staff_list_orders" \
  -H "apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### `POST` `/rest/v1/rpc/staff_update_order_status`

Locks the target order row (`FOR UPDATE`), verifies the transition against the allowed state machine (`pending -> confirmed | rejected`, `confirmed -> cooking`, `cooking -> ready`, `ready -> completed`), records `updated_by = auth.uid()`, and returns the updated `KioskOrder`. When transitioning `pending -> confirmed`, the function also locks all ordered `public.products` rows (`FOR UPDATE`), verifies sufficient stock (raising `Insufficient stock to accept this order.` if any item is short), deducts ordered quantities from `stock_quantity`, and sets `available = false` for any item whose remaining stock reaches `0`.

**Request URL**

```text
https://<project-ref>.supabase.co/rest/v1/rpc/staff_update_order_status
```

**Authentication:** `authenticated` (active staff)

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `p_token` | required | Order UUID token. | `string (uuid)` | `body` | `"6b2f6c1e-7a2d-4c8d-a2b4-41d5c2f91e04"` |
| `p_status` | required | Next valid status (`confirmed`, `rejected`, `cooking`, `ready`, or `completed`). | `string` | `body` | `"confirmed"` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Updated order record | `KioskOrder` (`object`) | `{ "token": "6b2f...", "queueNumber": 8, "status": "confirmed", ... }` |
| `400` | Unauthorized, missing order, invalid transition, or insufficient stock (`Order not found.`, `Invalid status transition.`, `Insufficient stock to accept this order.`) | `Error` (`object`) | `{ "code": "P0001", "message": "Insufficient stock to accept this order." }` |

**Sample request**

```bash
curl -X POST "https://<project-ref>.supabase.co/rest/v1/rpc/staff_update_order_status" \
  -H "apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_token": "6b2f6c1e-7a2d-4c8d-a2b4-41d5c2f91e04",
    "p_status": "confirmed"
  }'
```

### `GET` `/rest/v1/products`

Reads the product catalog, availability flags, and stock quantities ordered ascending by `id`. Used by both the public customer kiosk (`listMenuProducts` in `src/services/products.ts`, with a 10-second `AbortController` timeout, strict row/duplicate validation, effective `available = row.available && row.stock_quantity > 0`, and no sample substitution when the table is empty) and the staff inventory page (`listStaffProducts` in `src/services/staffProducts.ts`). Seed the 57 default rows with [supabase-menu-seed.sql](supabase-menu-seed.sql).

**Request URL**

```text
https://<project-ref>.supabase.co/rest/v1/products?select=id,category_id,name,price,available,stock_quantity&order=id.asc
```

**Authentication:** `anon` or `authenticated`

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `select` | optional | Columns projected by kiosk and staff clients. | `string` | `query` | `"id,category_id,name,price,available,stock_quantity"` |
| `order` | optional | PostgREST sort expression. | `string` | `query` | `"id.asc"` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Array of product rows | `object[]` | `[ { "id": "best-sellers-1", "category_id": "best-sellers", "name": "Spanish Latte", "price": 180, "available": true, "stock_quantity": 10 } ]` |

### `POST` `/rest/v1/rpc/staff_update_product_availability`

Updates a product's `stock_quantity` and `available` status. When `p_quantity` is `0`, the server forces `available = false`.

**Request URL**

```text
https://<project-ref>.supabase.co/rest/v1/rpc/staff_update_product_availability
```

**Authentication:** `authenticated` (active staff)

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `p_id` | required | Product slug (`^[a-z0-9-]{1,64}$`). | `string` | `body` | `"best-sellers-1"` |
| `p_available` | required | Desired availability flag (overridden to `false` when `p_quantity` is `0`). | `boolean` | `body` | `true` |
| `p_quantity` | required | Whole number between `0` and `999`. | `integer` | `body` | `15` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Updated product payload | `object` | `{ "id": "best-sellers-1", "categoryId": "best-sellers", "name": "Spanish Latte", "price": 180, "available": true, "quantity": 15 }` |
| `400` | Validation or lookup error (`Invalid product identifier.`, `Quantity must be between 0 and 999.`, `Product not found.`) | `Error` (`object`) | `{ "code": "P0001", "message": "Quantity must be between 0 and 999." }` |

**Sample request**

```bash
curl -X POST "https://<project-ref>.supabase.co/rest/v1/rpc/staff_update_product_availability" \
  -H "apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "p_id": "best-sellers-1", "p_available": true, "p_quantity": 15 }'
```

## 8. Manager and admin invitation endpoints

These RPCs are defined in [supabase-staff-schema.sql](supabase-staff-schema.sql) for onboarding employees via SQL Editor or authenticated `manager`/`admin` sessions.

### `POST` `/rest/v1/rpc/generate_staff_invitation`

Generates a random code (`BNB-XXXX-XXXX-XXXX`), persists only its SHA-256 hash in `public.staff_invitations`, and returns the plaintext code once.

**Request URL**

```text
https://<project-ref>.supabase.co/rest/v1/rpc/generate_staff_invitation
```

**Authentication:** `authenticated` (`admin` or `manager` role) or SQL Editor

**Parameters**

| Name | Required | Description | Type | Parameter Type | Example |
| --- | --- | --- | --- | --- | --- |
| `p_role` | optional | Role granted on signup (`staff`, `manager`, or `admin`). Default `staff`. | `string` | `body` | `"staff"` |
| `p_max_uses` | optional | Maximum registrations allowed (`1` to `100`). Default `1`. | `integer` | `body` | `1` |
| `p_expires_hours` | optional | Expiration window in hours (`null` for no expiry). Default `168`. | `integer \| null` | `body` | `72` |

**Responses** · Response content type: `application/json`

| Code | Description | Type | Example |
| --- | --- | --- | --- |
| `200` | Plaintext invitation code returned once | `string` | `"BNB-4A9F-82C1-0E7B"` |
| `400` | Caller is not an active manager or admin | `Error` (`object`) | `{ "code": "P0001", "message": "Unauthorized: manager or admin role required." }` |

### `POST` `/rest/v1/rpc/create_staff_invitation`

Hashes and upserts a caller-chosen invitation code (`^[A-Z0-9-]{6,32}$`) into `public.staff_invitations`. Uses the same authentication rules and optional `p_role`, `p_max_uses`, and `p_expires_hours` parameters as `generate_staff_invitation`, plus required `p_code` (`string`). Returns HTTP `204` (void) on success.

## 9. Realtime subscriptions

Authenticated staff views receive live change notifications over Supabase Realtime (`wss://<project-ref>.supabase.co/realtime/v1/websocket`):

| Channel name | Event | Schema and table | Client handler |
| --- | --- | --- | --- |
| `staff-orders-watch` | `postgres_changes` (`*`) | `public.orders` | Calls `staffOrdersStore.refresh()` to reload orders from `staff_list_orders` |
| `staff-products-watch` | `postgres_changes` (`*`) | `public.products` | Calls `staffProductsStore.refresh()` to reload stock from `GET /rest/v1/products` |

Both `public.orders` and `public.products` are added to the `supabase_realtime` publication in [supabase-staff-schema.sql](supabase-staff-schema.sql). Both subscriptions are reference-counted inside Pinia (`startWatching()`) so mounted staff views share one open channel and unsubscribe cleanly on unmount.

## 10. Error handling

### 10.1 Error response formats

PostgREST / PostgreSQL RPC errors:

```json
{
  "code": "P0001",
  "details": null,
  "hint": null,
  "message": "Invalid status transition."
}
```

Supabase Auth (GoTrue) errors:

```json
{
  "code": 400,
  "error_code": "invalid_credentials",
  "msg": "Invalid login credentials"
}
```

### 10.2 HTTP status codes and client mapping

| HTTP Code | Meaning | How BnB-Kiosk handles it |
| --- | --- | --- |
| `200` / `204` | Success | Validates payload shape (`parseProduct`, `parseOrder`, or typed mappers) before updating Vue reactive state; malformed or duplicate product rows raise `The menu service returned an invalid response. Please ask the cashier.`. |
| `400` | PostgreSQL `RAISE EXCEPTION` (`P0001`), malformed UUID (`22P02`), or bad Auth input | Displays plain-language inline error or alert. `create_kiosk_order` maps backend errors to `Your order could not be sent. Please try again or ask the cashier.`; `staff_update_order_status` failures (such as insufficient stock) populate `ordersStore.errorMessage` in `StaffQueueView.vue`; `loginStaff` increments the throttle counter and shows `Invalid email address or password.`. |
| `401` / `403` | Expired/missing JWT or RLS/privilege denial | Navigation guard redirects unauthenticated visitors to `/login` (or `/staff/login`) with sanitized internal redirect path. |
| `404` | Endpoint or resource missing (or `null` from `get_kiosk_order`) | `getOrder` throws `This order could not be found. Please ask the cashier.` without rendering a QR code or resubmitting. |
| `422` | Unprocessable Auth payload (for example duplicate email or unchanged password) | Surfaces the Auth error message on the registration or account form. |
| `429` | Supabase rate limit exceeded | Surfaces an error message; client login throttle separately prevents rapid password retries for 60 seconds after 5 failures. |
| `500` / timeout / network failure | Server error, 10s menu timeout, or offline connection | `MenuView.vue` shows `We could not load the menu. Please try again or ask the cashier.` with a `Try again` button and never substitutes sample items; `OrderStatusView.vue` keeps the last known order state visible, shows `Unable to check your order. Reconnecting…`, and retries automatically on the next 2.5-second tick or via `Check again`. |
