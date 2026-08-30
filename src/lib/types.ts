import { DEFAULT_MODULES as FULL_MODULES } from "./modules";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type JournalSource =
  | "manual"
  | "cash_receipt"
  | "cash_payment"
  | "cash_transfer"
  | "sales_invoice"
  | "invoice_payment"
  | "purchase_invoice"
  | "bill_payment"
  | "credit_note"
  | "debit_note"
  | "opening"
  | "payroll"
  | "depreciation"
  | "amortization"
  | "writeoff"
  | "production"
  | "expense_claim";

export type InvoiceStatus = "draft" | "posted";

export const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

export const DEFAULT_MODULES = {
  cash: true,
  customers: true,
  invoices: true,
  reports: true,
  sales: true,
  purchases: true,
  projects: true,
  inventory: true,
  payroll: true,
  assets: true,
  equity: true,
  ...FULL_MODULES,
};

export type Modules = typeof DEFAULT_MODULES;
