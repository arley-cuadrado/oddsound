# Oddsound commerce operations

## Deployment

The new flow uses Wompi for new orders; Mercado Pago historical orders and webhook remain separate. No historical balances are imported into the Wompi ledger. New OAuth connections return HTTP 410. Keep the legacy credentials while historical operations remain open.

1. Install with Node 22+ and pnpm 11.1.1 (`pnpm install --frozen-lockfile`). MongoDB 7 must be a replica set, including development. The existing Docker Compose file starts the local replica set.
2. Configure `.env` using `.env.example`. Use a stable `MARKETPLACE_TOKEN_ENCRYPTION_KEY`, store it outside MongoDB backups, and back it up securely: losing it loses access to encrypted bank details and evidence. Configure SMTP for customer receipt/access emails.
3. Run `pnpm commerce:init` to add the unique payment-reference and query indexes without importing historical balances. Run `pnpm generate:types`, `pnpm generate:importmap`, and build the Next.js application. Start the separate worker with `pnpm commerce:worker` or `docker build -f Dockerfile.commerce-worker -t oddsound-commerce-worker .` and run that image with the same database and secrets. Do not expose the MongoDB port publicly.
4. Initialize settings in `/dashboard/globals/commerceSettings`. All money-moving features default OFF. Confirm the 12% initial commission explicitly or change it. Configure holiday dates as a JSON array of Colombian `YYYY-MM-DD` dates. Default weekly submission is Wednesday 09:00 America/Bogota.
5. Register Wompi notifications: `/creator-api/payments/wompi/webhook` for collection; `/creator-api/payments/wompi/payout-webhook` for disbursements. They use separate event secrets. Their persistent inbox survives task crashes; the worker processes inbox tasks.
6. Review the commercial authorization for third-party collection, available funds, fees, refunds, and batch approval with Wompi. Set `productionApproved` only after sandbox validation and account-specific production checks. `automaticPayoutsApproved` describes the contracted capability; it never bypasses Wompi's approval requirements.
7. `SHOPPING_ENABLED` stops new shopping; `chargesEnabled`, `payoutsEnabled`, and `refundsEnabled` independently stop provider requests. Disputes, access to historical orders and reconciliation continue when shopping is paused. Roll back the application only after keeping the worker/webhooks required by outstanding operations available.

The runtime uses direct Mongoose operations in a confined service layer to share one explicit session across inventory, journals and persisted tasks. Public Payload API writes to financial collections, orders and transactions are denied. The finance JSON field cannot be edited through Payload, even by overriding normal document ownership. Journals and audit history are append-only; corrections are new postings, not edits.

## Operator workflow

Use `/creator/commerce-admin` (also linked from the Payload admin).

- Artists register bank details in `/creator/dashboard`. Fetch the bank IDs from Wompi `/banks`; artists select a bank rather than sharing credentials. An administrator must inspect and verify ownership with evidence and the current bank revision. Replacing a bank invalidates verification and pauses new disbursements. No artist API returns unmasked bank details.
- Reconcile each order's actual processor fee and availability against a Wompi statement (`reconcile`). Unknown fees are not treated as zero. An order with missing reconciliation never becomes payable. Disbursement fees are borne by Oddsound, not deducted from the artist's order.
- Attest the provider's current available balance daily using `attestBalance` and attach an extract reference. The balance must be no older than 24 hours to prepare new payouts. Confirmed previous payouts are folded into that observation baseline, while in-flight amounts remain reserved. A discrepancy must set `reconciliationBlocked`; do not clear it until the discrepancy is resolved.
- `ownRefundFundsInCents` is the documented cumulative backing allocated by Oddsound for refunds, including allocations already spent. The journal tracks consumed/reserved backing separately. Increase backing only after funding treasury and documenting it; do not count funds owed to other artists as own liquidity. If there is insufficient backing, no new mediated refund is authorized.
- Configure `payoutFeeReserveInCents` as a conservative per-transfer bound from your Wompi contract and back it with `ownPayoutFundsInCents`, distinct from artist funds and refund backing. The default zero reserve blocks payouts. Reconcile actual paid-transfer fees with `reconcilePayoutFee`; fees above the bound block further payouts until the funding discrepancy is resolved.
- The worker computes weekly amounts from the ledger, never a fixed recurring amount. It uses a stable artist/week reference to prevent duplication after a calendar change. ACH credit can occur after the submission day. Payouts with an uncertain POST result are never blindly reposted, including after the provider's idempotency window expires.
- Inspect uncertain transfers in the Wompi dashboard. Use `associatePayout` with the verified provider ID and statement evidence to recover correlation; the worker queries individual transactions. A batch-wide success or partial success does not mark every beneficiary paid. Unknown submissions without a verified provider ID stay reserved for operator reconciliation.
- A claim immediately freezes unsubmitted funds for the affected order. This first implementation conservatively holds the full unpaid net of the order while the affected units are assessed. Sellers have two business days to reply; timeout escalates rather than automatically refunding or sanctioning.
- Refund creation means only a request was submitted. Use `confirmRefund` only after verifying the actual credit or bank reimbursement, not merely an accepted API response. If the original method cannot receive a refund, arrange a transfer to the verified buyer, then record that bank receipt. Uncertain refund requests must be checked with Wompi before any alternative payment. This prevents refund/chargeback duplication.
- Record bank-reported chargebacks with `recordChargeback` and evidence. A pending refund on that order blocks automatic chargeback allocation: reconcile the two provider operations first. A post-payment VOIDED event freezes the order and raises a reconciliation task. Do not interpret a duplicate approved charge or late approval as a new fulfilled sale; the worker flags it for explicit mediation/reimbursement. A late approval after stock release never ships automatically.
- Third confirmed seller-attributable incident blocks new sales. Incident references are unique by order. Unfounded complaints and carrier-only faults do not count. `appeal` allows an evidenced administrative review without deleting incident history. Existing orders, messages and bank obligations remain accessible.

## Tracking coverage and evidence

Seven carriers are initially registered: Servientrega, Coordinadora, Inter Rapidísimo, Envía, TCC, Deprisa, 4-72. Their automatic connectors are deliberately disabled until authorized real guides and access conditions have been tested. No production courier credentials or authorized live guides were supplied with the implementation. This is not a claim that all seven websites can be scraped automatically.

`registerCarrier` adds another verified operator and official HTTPS domain to the catalogue. `configureCarrier` records its assessment and enables API and/or scraping independently. Assessment must include `evidence` and `authorizedGuidesTested`; the operator should record corporate identity, relevant postal registration, coverage, access conditions, delivery proof, and observed test cases. APIs requiring corporate accounts or permitting only account-owned guides must be tested with artists' externally purchased labels.

API configuration shape:

```json
{
  "url": "https://OFFICIAL-CARRIER-DOMAIN/path/{guide}",
  "headerEnv": {"Authorization": "TRACKING_CARRIER_AUTHORIZATION"},
  "eventsPath": "events",
  "estimatedDeliveryPath": "estimatedDeliveryAt",
  "statusKey": "status",
  "dateKey": "date",
  "descriptionKey": "description",
  "statusMap": {"OFFICIAL_STATUS": "in_transit"}
}
```

Each scraper configuration defines `url`, optional `inputSelector` and `submitSelector`, and required `rowSelector`, `statusSelector`, `dateSelector`, `descriptionSelector`, and `statusMap`. Map exact carrier statuses to `registered`, `in_transit`, `exception`, `delivered`, or `returned`. Dates must be unambiguous and parseable; do not infer delivery by searching the entire page for a word. Configurations are editable only via authenticated administrative operations and never expose environment secret values.

API failure falls back to the independently enabled scraper. HTTPS official-domain checks, redirect rejection and browser subrequest restrictions prevent requests to arbitrary URLs. No CAPTCHA bypass, rotating proxies or authentication bypass are implemented. External scripts hosted on other domains are blocked; test this per carrier. If both methods fail, the cached state and official link remain, with increasing retry delay. Default active polling interval is four hours; completed/returned shipments stop routine polling.

Carrier delivery is evidence, not payment authority. An administrator validates date, recipient/destination and correspondence to the purchased units using `verifyDelivery`. All units across all guides must be accounted for. Seven days after the final verified delivery, with available funds and no hold, the order becomes payable. Exceptions/returns freeze remaining funds; use `resolveShippingException` with evidence after resolving the carrier issue. The seven-day release policy does not shorten statutory complaint/return rights.

## Interfaces and security

`GET /creator-api/commerce/operations` returns a scoped overview. Authenticated artists see their own orders; buyers see their purchases. For guest purchases, `guestRequest` accepts order ID and matching email, replies generically, applies a five-minute cooldown and sends a seven-day hashed-token link. `guestVerify` exchanges the link for an HttpOnly SameSite cookie; the client removes the token from the URL fragment. The order ID or tracking code alone is never an access credential.

POST actions are explicitly authorized by role and order ownership:

- Seller: `bank`, `shipment`, `message`, `attachment`.
- Buyer: `openCase`, `message`, `attachment`, `guestRequest`, `guestVerify`.
- Admin: `inspectBank`, `verifyBank`, `reconcile`, `attestBalance`, `verifyDelivery`, `decideCase`, `confirmRefund`, `recordChargeback`, `associatePayout`, `cancelPayout`, `reconcilePayoutFee`, `resolveShippingException`, `appeal`, `configure`, `registerCarrier`, `configureCarrier`, `journalCorrection`.

All monetary API action inputs (`cost`, `amount`, `refund`, posting `amount`) use integer centavos. `journalCorrection` requires a new unique reference, balanced postings and evidence. Use it only for a documented correction, with independent review. `downloadAttachment` is GET, scoped to case participants. Evidence is encrypted and downloaded as an attachment, never stored in the public media collection; allowed types are PDF/PNG/JPEG up to 2 MB.

## Checks, monitoring and restoration

- `node --import tsx scripts/test-commerce.mts integration`: existing integration suite with temporary replica set.
- `node node_modules/vitest/vitest.mjs run tests/int/commerce-finance.int.spec.ts`: transaction/concurrency tests against a separate disposable MongoDB replica set.
- `node --import tsx scripts/test-commerce.mts e2e`: tracking/email-token fixture tests plus a real local band/fan workflow (product editor, guide, private conversation, claim and verified review). Payment approval and delivery evidence are seeded locally; no money is moved and no live carrier is queried.
- `node --import tsx scripts/test-commerce.mts build`: production build against an empty temporary database.
- `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`: ordinary project checks using your configured environment.

Monitor worker liveness, old leases, failed tasks, overdue dispatches, escalated cases, stale balance attestations, unknown payouts/refunds and repeated connector failures. The admin UI displays failed tasks; worker errors go to structured logs. Configure deployment alerting on these signals. Persisted task leases recover interrupted work; uncertain external writes remain uncertain until queried or reconciled.

Before production, take an encrypted MongoDB replica-set backup and a separate secure backup of the encryption key; restore into an isolated database, verify every journal sums to zero, recompute artist balances from postings, compare with provider statements, and replay a duplicate notification. Real provider acceptance, carrier access and backup infrastructure require account/operator validation; local tests cannot certify them.

## Seller hub, messages and reviews

Products retains Payload's native list/editor and adds the seller hub above the list. Artists and bands create physical products with shipping; admin-only checkout fields are protected at field and endpoint level. Existing digital products require administrative review rather than automatic conversion. New prices default to COP.

Run `pnpm commerce:init` before enabling this release on an existing database. It creates compound unique indexes for reviews (buyer/order/product) and reports (review/reporter), plus the conversation message pagination index. No historical orders enter the Wompi ledger automatically. The summary aggregates all paid Wompi orders and ledger postings independently of pagination.

Order conversations are separate from formal cases: a message does not hold funds. Messages poll only while the conversation is open and the document visible; read cursors mark only the loaded latest page. Guests retain per-order verified access, while reviews require a fan account and verified delivery of all purchased units of the reviewed product. Public reviews expose only display name, stars, comment and date; administration can inspect edit history, review reports and audit moderation decisions. Hidden reviews stay hidden when edited. Reviews do not create seller incidents.

`SHOPPING_ENABLED=false` continues to stop public shop/cart purchases while authoring, order support and reconciliation remain available. Keep production charge/payout switches disabled until the provider and bank verification requirements above are met. Only bank accounts are supported as payout destinations in this release.

## Shop Register lists

The 18 administrator-only lists in `/dashboard/shop-register` use native Payload server pagination: 15 records by default, with 15/30/50/100 choices. Payload saves each administrator's page-size preference per collection; an existing saved size is retained and remains selectable. Newest records appear first, with ID as a stable tie-breaker.

Each list's native search covers the available names, file names, references or text fields appropriate to that record type. It does not search encrypted bank details, access-token hashes or lock leases. The additional date controls filter creation or last-update dates by day, month, year or inclusive date range in Colombia (UTC−05:00). Applying or clearing a date filter resets the page while preserving text search and unrelated advanced filters. Pagination and browser navigation retain applied filters. Filtering does not change records or their access, edit or delete permissions.
