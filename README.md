# PayPal BusinessPilot AI

> One AI Assistant. Every Business. Smarter Decisions.

BusinessPilot AI is a full-stack business finance dashboard for small businesses (retail shops, restaurants, freelancers,
e-commerce and service providers). It tracks income, expenses, invoices and payments in one place. An AI assistant answers
questions about the business in plain language, using figures computed from the owner's own records. Payments run through the
**PayPal Sandbox**, and every capture is verified on the server.

---

## Feature status

| Area | Status | Notes |
|---|---|---|
| Landing page, responsive app shell | ✅ Complete | Desktop sidebar, mobile drawer |
| Registration, login, logout, sessions | ✅ Complete | scrypt password hashing, httpOnly session cookie, 30-day expiry |
| Business profile | ✅ Complete | Name, type, currency, contact details |
| Income & expenses (CRUD) | ✅ Complete | Create, edit, delete with ownership checks |
| Dashboard (KPIs, charts, transactions, insights) | ✅ Complete | Daily / weekly / monthly views |
| Transactions ledger | ✅ Complete | Unified timeline, filters, search, CSV export |
| Invoices (items, totals, send, mark paid, delete) | ✅ Complete | Totals calculated server-side |
| Payments page (sandbox order → approve → capture → verify) | ✅ Complete in code · ⚠️ needs sandbox credentials to run end-to-end | Simulated payments work without credentials |
| PayPal webhook receiver | ✅ Implemented · ⚠️ Unverified | Signature verification requires `PAYPAL_WEBHOOK_ID` and a public URL |
| Analytics (periods, growth, categories, products, payment stats) | ✅ Complete | All numbers come from stored rows |
| Growth Advisor (rule-based, evidence-linked) | ✅ Complete | See "Growth Advisor rules" below |
| AI assistant (rules engine, chat history) | ✅ Complete | Works without any API key |
| AI assistant LLM phrasing (OpenAI) | ⚠️ Implemented, unverified | Requires `OPENAI_API_KEY`; the model is only allowed to rephrase computed facts |
| Demo data loader | ✅ Complete | Every demo row is flagged and labelled |
| Row-level security (Postgres) | ⚠️ Optional, not enabled | See `database/rls-hardening.sql` and "Security" below |

---

## Technology stack

- **Framework:** Next.js 16 (App Router, route handlers) with React 19 and TypeScript
- **Styling:** Tailwind CSS v4, custom navy / PayPal-blue theme (`src/app/globals.css`)
- **Charts:** Recharts 3 · **Icons:** lucide-react · **Validation:** Zod 4
- **Database:** PostgreSQL 15 with Drizzle ORM (`drizzle-orm/node-postgres`, `pg`)
- **Auth:** email + password, scrypt hashing (`node:crypto`), DB-backed sessions (SHA-256 token hashes stored)
- **Payments:** PayPal REST Orders v2 (Sandbox only), server-side verification
- **AI:** deterministic analytics-backed rules engine, optional OpenAI-compatible chat completion for phrasing

---

## Architecture

```
Browser (React client pages)
   │  fetch JSON (same-origin, httpOnly session cookie)
   ▼
Next.js route handlers  src/app/api/**        ← validation (Zod), auth (requireUser), error mapping (withApi)
   │
   ├─ src/lib/analytics.ts   → computes revenue / expenses / profit / growth from stored rows
   ├─ src/lib/advisor.ts     → Growth Advisor rules (each recommendation cites its evidence)
   ├─ src/lib/assistant.ts   → intent detection → computed answer → optional LLM phrasing
   ├─ src/lib/paypal.ts      → PayPal Sandbox REST client (OAuth token cache, orders, capture, webhook verify)
   ├─ src/lib/payments.ts    → verification: re-fetch order, check status/amount/currency, write transaction
   └─ src/lib/demo.ts        → labelled demo dataset generator (seeded PRNG)
   │
   ▼
Drizzle ORM  src/db/schema.ts  →  PostgreSQL
```

### Data model (`src/db/schema.ts`)

| Table | Purpose |
|---|---|
| `users` | Accounts (email unique, scrypt password hash) |
| `sessions` | Session tokens (only SHA-256 hashes stored), expiry |
| `businesses` | One business profile per user (currency lives here) |
| `income` | Manual sales / income entries (received or pending, optional product & customer, optional invoice link) |
| `expenses` | Expense entries with category and vendor |
| `invoices` / `invoice_items` | Invoices with line items; totals stored, unique number per user |
| `payments` | Payment orders. `provider` = `paypal_sandbox` or `simulated`; `verified` only after PayPal verification |
| `transactions` | Settled money movements (`source` = `paypal_sandbox` or `simulated`, `verified` flag, unique PayPal capture ID) |
| `ai_messages` | Assistant conversation history with data-source metadata |
| `paypal_webhook_events` | Audit log and idempotency for received webhooks |

All money is stored as **integer cents**. Every table that holds user data carries `user_id`, and every query filters on it.

### Verified vs simulated vs demo

- **Verified** — a PayPal Sandbox order that was captured, then re-fetched from PayPal with status `COMPLETED`, matching amount and currency.
- **Simulated** — a checkout completed inside the app without PayPal (`provider = simulated`, `verified = false`). Labelled "Simulated" everywhere.
- **Demo** — rows generated by "Load demo data" (`is_demo = true`). Labelled "Demo data" everywhere.

### Financial definitions

- **Revenue (income)** = received manual income + paid-invoice income (offline) + completed payment transactions.
- **Total expenses** = sum of all expense entries.
- **Estimated profit** = Total income − Total expenses. **Margin** = profit ÷ income.
- **Pending payments** = pending income entries + outstanding (sent) invoices + open payment orders.
- **Growth** = period over period change (this month vs last month). `n/a` is shown when there is no baseline.

### Growth Advisor rules

| Rule | Trigger | Evidence shown |
|---|---|---|
| Expense spike | expenses up ≥ 15% month over month | categories with the largest increases |
| Overdue invoices | sent invoices past due date | invoice numbers, customers, amounts, due dates |
| Open invoices | sent invoices not yet due | outstanding invoices |
| Approved but not captured | PayPal order `APPROVED` locally | count and value |
| Low margin | margin below 20% | largest expense category |
| Revenue growth / drop | month over month ≥ +0% / ≤ −10% | largest income source, top product |
| Product concentration | one product ≥ 50% of product revenue | top products |
| Expense concentration | one category ≥ 40% of expenses | category shares |
| Simulated / demo notices | simulated payments or demo records present | counts |

### AI assistant behaviour

1. The question is classified (revenue, expenses, expense change, profit, pending, products, payments, recommendations, summary, help).
2. Figures are computed from the analytics snapshot for the requested period (today, this week, this month, last month, all time…).
3. The answer lists the supporting facts and a data-source badge (records / demo / mixed).
4. With `OPENAI_API_KEY`, the draft and facts go to the model with a strict instruction to use **only** provided numbers. If the call fails, the rules answer is returned and the UI shows "LLM unavailable".
5. Unclear questions get a help response with examples. The assistant never guesses a number.

---

## Getting started

### Prerequisites

- Node.js 20.9+ (tested with Node 22) and npm
- PostgreSQL 14+ running locally (tested with PostgreSQL 15)

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# edit .env: DATABASE_URL is required; PayPal and OpenAI values are optional
```

### 3. Create the database and apply the schema

```bash
psql postgresql://postgres:postgres@127.0.0.1:5432/postgres -c "CREATE DATABASE app_db;"   # skip if it exists
npx drizzle-kit push        # creates all tables from src/db/schema.ts
```

`drizzle.config.json` points at the same local database. Change it if your database URL differs.

### 4. Run

```bash
npm run dev          # development server on http://localhost:3000
# or
npm run build && npm run start   # production build
```

Health check: `GET /api/health` returns `{"ok": true}` when the database is reachable.

### 5. Try it

1. Open `/register`, create an account (the business profile is created automatically).
2. On the dashboard click **Load demo data** (or add your own entries under **Income & Expenses**).
3. Ask the **AI Assistant**: "How much did I earn this month?", "Why did my expenses increase?", …
4. Open **Invoices**, create an invoice, mark it sent, then open it and use **Pay with PayPal Sandbox** or **Simulate customer payment**.

### PayPal Sandbox setup

1. Sign in to <https://developer.paypal.com/dashboard> and create a **Sandbox** app. Copy its client ID and secret.
2. Put them in `.env` as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. Keep `PAYPAL_API_BASE` on the sandbox host.
3. Restart the server. The **Payments** page shows PayPal Sandbox as available.
4. Create a payment, click **Open PayPal**, and log in with a **sandbox buyer account** from the developer dashboard (never a real account).
5. You are redirected back to `/payments`. The app captures the order and re-verifies it with PayPal before marking it verified.
6. Optional webhooks: in the sandbox app, add a webhook pointing at `https://<your-public-host>/api/paypal/webhook` and set `PAYPAL_WEBHOOK_ID`. Webhooks cannot reach `localhost`. Use a tunnel such as ngrok for local testing.

### Optional: AI phrasing

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL` or `OPENAI_BASE_URL`). The assistant then rephrases its computed answers. Without a key it uses the rules engine only.

---

## API reference

All endpoints return JSON. Errors are `{ "error": "message" }`, or `{ "error": "Validation failed", "issues": [{ "path", "message" }] }` with status 422. Authenticated endpoints return 401 without a session cookie. Resources owned by another user return 404.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, businessName? }` → creates user, business and session |
| POST | `/api/auth/login` | `{ email, password }` → session cookie |
| POST | `/api/auth/logout` | Ends the session |
| GET | `/api/auth/me` | `{ user }` or `{ user: null }` |
| GET / PUT | `/api/business` | Business profile `{ name, type, currency, email?, phone?, website? }` |
| GET / POST | `/api/income` | List / create `{ amount, description, category?, product?, customerName?, status?, occurredOn }` |
| PATCH / DELETE | `/api/income/{id}` | Partial update / delete |
| GET / POST | `/api/expenses` | List / create `{ amount, description, category?, vendor?, occurredOn }` |
| PATCH / DELETE | `/api/expenses/{id}` | Partial update / delete |
| GET | `/api/transactions?limit=` | Unified ledger (income, expenses, payments) |
| GET / POST | `/api/payments` | List / create `{ amount, description, mode: "paypal_sandbox" \| "simulated", invoiceId?, payerEmail?, currency? }` |
| GET | `/api/payments/{id}` | Payment, re-checked with PayPal for sandbox orders |
| POST | `/api/payments/{id}/capture` | Capture and verify an approved PayPal Sandbox order |
| POST | `/api/payments/{id}/simulate` | Complete a simulated payment (recorded as not verified) |
| POST | `/api/paypal/webhook` | PayPal webhook receiver (signature verified) |
| GET / POST | `/api/invoices` | List / create `{ customerName, customerEmail?, issueDate, dueDate, taxRate?, notes?, status?, items[] }` |
| GET / PATCH / DELETE | `/api/invoices/{id}` | Detail with items and payments / update status, customer, due date / delete (not paid) |
| POST | `/api/invoices/{id}/mark-paid` | Record offline payment, creating a linked income entry |
| GET | `/api/analytics` | Full analytics snapshot |
| GET | `/api/advisor` | Growth Advisor recommendations + key metrics |
| GET / POST / DELETE | `/api/assistant` | Chat history / ask `{ message }` / clear history |
| POST / DELETE | `/api/demo` | Load / clear demo dataset |
| GET | `/api/integrations` | Configuration status (never exposes secrets) |
| GET | `/api/health` | Database health check |

---

## Testing

Automated checks run in this repository's validation sequence:

```bash
npx next typegen
npm exec tsc -- --noEmit
npm run build
```

Manual test checklist (see the "Test results" section in the delivery notes for what was exercised):

- [ ] Register, log out, log in, and confirm protected pages redirect when signed out
- [ ] Add, edit and delete income and expenses; confirm dashboard and analytics update
- [ ] Load demo data; confirm demo labels appear; clear demo data
- [ ] Create, send, and mark an invoice paid; confirm income and revenue update
- [ ] Ask every suggested assistant question and check figures against the Analytics page
- [ ] Simulated payment completes and appears in Transactions as "Simulated"
- [ ] PayPal Sandbox order: create → approve with sandbox buyer → return → verified (needs credentials)
- [ ] Check layouts at 375 px, 768 px and 1280 px widths

---

## Security

- Secrets (`PAYPAL_CLIENT_SECRET`, `OPENAI_API_KEY`, `DATABASE_URL`) are only read on the server. They are never sent to the browser. `/api/integrations` reports presence only.
- Passwords: scrypt with a random 16-byte salt and a 64-byte key. Comparison uses `timingSafeEqual`.
- Sessions: 32 random bytes in an httpOnly, SameSite=Lax cookie. The database stores only a SHA-256 hash. Set `COOKIE_SECURE=true` behind HTTPS.
- Authorization: every read, update and delete includes the owner's `user_id`. Cross-user IDs return 404.
- Input validation: every request body is validated with Zod. Money uses integer cents. Invoice totals and invoice payment amounts come from stored records, not the browser.
- Payment verification: a PayPal capture is accepted only after the order is re-fetched from PayPal with status `COMPLETED`, and the amount and currency match the stored payment.
- Webhooks: events are accepted only when PayPal's signature verification API returns `SUCCESS`. Events are deduplicated by ID.
- Sandbox guard: the PayPal client refuses any base URL other than `https://api-m.sandbox.paypal.com`.
- No card numbers or CVVs are collected or stored. Checkout takes place on PayPal's pages.
- Optional Postgres RLS policies are provided in `database/rls-hardening.sql`, but are **not enabled** by default (see the file's notes).

---

## Project structure

```
src/
  app/
    layout.tsx, page.tsx (landing), globals.css
    (auth)/login, (auth)/register          ← public auth pages
    (app)/layout.tsx                        ← protected shell + session guard
    (app)/dashboard, assistant, payments, transactions, income-expenses,
          invoices, invoices/[id], analytics, growth-advisor, settings
    api/...                                 ← route handlers (see API reference)
  components/   ui.tsx, toast.tsx, charts.tsx, app-shell.tsx, auth-form.tsx
  db/           index.ts (pg pool + Drizzle), schema.ts
  lib/          api.ts, auth.ts, business.ts, client-api.ts, money.ts, validators.ts,
                analytics.ts, advisor.ts, assistant.ts, paypal.ts, payments.ts,
                invoices.ts, demo.ts
database/rls-hardening.sql                  ← optional RLS policies
.env.example                                ← safe environment template
```

---

## Known limitations

- **Single business per user.** The data model supports multiple, but the UI manages one.
- **No email delivery.** "Send" marks an invoice as sent. It does not email the customer.
- **No password reset or email verification.** Login rate limiting is not implemented.
- **PayPal Sandbox only.** Live payments are intentionally blocked in code.
- **Webhooks need a public URL** and are unverified in this environment.
- **OpenAI phrasing is unverified** because no API key was available during development. The rules engine is the tested path.
- **Analytics load all records** for the user on each request. This is fine for a prototype, but large datasets would need SQL aggregation.
- **Invoice line items cannot be edited after creation.** Delete and recreate the invoice instead.
- **Application-level scoping is the primary access control.** The default local Postgres role is a superuser, which bypasses RLS.
- **Date-based views use UTC dates** and do not account for each user's time zone.

---

## Deployment

1. Provision PostgreSQL (for example Neon, Supabase or RDS) and set `DATABASE_URL`.
2. Set `APP_URL` to the public HTTPS origin, `COOKIE_SECURE=true`, and the PayPal sandbox variables.
3. Run `npx drizzle-kit push` against the production database once.
4. Deploy to any Node host (Vercel, Render, Railway, Fly.io) with `npm run build` and `npm run start`.
5. Register the public webhook URL in the PayPal sandbox app and set `PAYPAL_WEBHOOK_ID`.
6. Smoke test: `GET /api/health`, register, load demo data, create a sandbox order.

---

## License

Prototype for the PayPal hackathon. Not affiliated with PayPal, Inc. "PayPal" is a trademark of PayPal, Inc.
