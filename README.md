# LedgerDesk

Original double-entry bookkeeping for a single business. Invoices, cash, and reports all post through one journal. Not affiliated with any other accounting product.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). SQLite is created at `data/ledgerdesk.db` on first use, with a starter chart of accounts. Requires Node.js 22.13 or newer (`node:sqlite`).

## Phase 1

- Business settings and module visibility
- Chart of accounts
- Balanced journal entries
- Cash receipts and payments
- Customers, sales invoices, invoice PDF, invoice payments
- Trial balance, profit and loss, balance sheet
