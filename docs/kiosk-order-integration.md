# Kiosk → staff confirmation → tracking

The kiosk is responsible for collecting the cart/payment choice, submitting once,
waiting for the staff response, and showing the tracking QR. The staff page is
owned separately. No staff approval control is exposed on the kiosk.

## Order lifecycle

`pending → confirmed → cooking → ready → completed`

Staff can also change `pending → rejected`. A pending order must not enter the
cooking queue until the cashier has checked payment and set `confirmed`.
`confirmed` means the cashier accepted the order and verified payment; it does
not mean cooking has started. Choosing E-wallet is not an electronic payment.

The kiosk polls for its order every 2.5 seconds. It remains on **Waiting for
confirmation/payment** while pending, including after refresh. It shows the
`ScanQR.png` layout only for `confirmed`, `cooking`, `ready`, or `completed`.
Connection failures retain the last known state and retry without resubmission.
Rejected orders direct the customer to the cashier. Done clears only the kiosk
session and returns to the welcome page; the submitted order remains trackable.

## Supabase contract for the partner backend

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
The existing Supabase client is used when configured. The partner must implement
these two RPCs before enabling real ordering:

1. `create_kiosk_order(p_request jsonb) → jsonb`
2. `get_kiosk_order(p_token uuid) → jsonb | null`

Create request (camelCase keys):

```json
{
  "requestId": "a client-generated UUID",
  "orderType": "Dine-in",
  "paymentMethod": "cash",
  "items": [{ "id": "best-sellers-1", "quantity": 1 }]
}
```

`orderType` is `Dine-in` or `Take-out`; payment method is `cash` or `e-wallet`.
The server must validate product availability, quantities and prices against its
catalog, calculate totals, and persist a new `pending` order. Make `requestId`
unique and idempotent: retries return the same order instead of inserting again.
Do not accept client-supplied totals or a client-supplied confirmed status.

Both RPCs return this order shape:

```json
{
  "token": "an unguessable server-generated UUID",
  "requestId": "the original request UUID",
  "queueNumber": 8,
  "orderType": "Dine-in",
  "paymentMethod": "cash",
  "items": [{ "id": "best-sellers-1", "name": "Spanish Latte", "quantity": 1, "lineTotal": 180 }],
  "subtotal": 180,
  "discount": 0,
  "total": 180,
  "status": "pending",
  "createdAt": "2026-11-17T12:00:00Z"
}
```

The staff page should watch new pending orders, verify payment, and update the
same persisted order to `confirmed`. Later staff actions update cooking/ready/
completed. Restrict status changes to authorized staff on the server using RLS
or authorized server endpoints. The public RPCs must not permit status updates
or listing other orders. A token permits reading only that order's public status
and receipt; do not include staff/private information in its response.

QR links use `/order/<token>` on the kiosk's current origin. Deploy the frontend
to a customer-accessible HTTPS address with SPA route fallback. The phone and
kiosk must use the same Supabase backend. A localhost URL cannot be opened from
a customer's phone.

## Local UI development

Without Supabase settings, **Vite development mode only** uses localStorage.
The UI clearly marks this as a local preview. It supports same-origin browser
tabs, not separate devices, payments, or a production staff service. Production
builds never silently fall back to demo order storage.

An order is saved at `bnb.demo-order.<requestId>`. For UI integration tests, the
separate staff actor updates its `status` to `confirmed`; the kiosk observes the
storage event/poll and renders its real generated tracking QR. There is no
automatic approval timer and no customer-facing confirmation bypass.

The automated browser tests cover both pending/reload and an external staff
status update. Once the partner backend is ready, verify the same flow on two
devices before deployment.
