# LedgerDesk

Original double-entry bookkeeping for a single business. Invoices, cash, and reports all post through one journal. Not affiliated with any other accounting product.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires Node.js 22.13 or newer.

Local development uses SQLite at `data/ledgerdesk.db` unless `DATABASE_URL` is set. On first use the app creates a starter chart of accounts.

## Vercel

SQLite cannot persist on Vercel. Production uses Postgres.

1. Set the Node.js version to **22.x** in the Vercel project.
2. Add `DATABASE_URL` (Neon pooler connection string) for Production and Preview.
3. Add `LEDGERDESK_PASSWORD` and `AUTH_SECRET` so the public site is locked.
4. Redeploy. Sign in with the workspace password, then confirm a journal entry still exists after refresh.

Copy names from `.env.example`. Do not commit real secrets.

## Phase 1

- Business settings and module visibility
- Chart of accounts
- Balanced journal entries
- Cash receipts and payments
- Customers, sales invoices, invoice PDF, invoice payments
- Trial balance, profit and loss, balance sheet
