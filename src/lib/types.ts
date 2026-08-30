export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type JournalSource =
  | "manual"
  | "cash_receipt"
  | "cash_payment"
  | "sales_invoice"
  | "invoice_payment";

export type InvoiceStatus = "draft" | "posted";

export const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

export const DEFAULT_MODULES = {
  cash: true,
  customers: true,
  invoices: true,
  reports: true,
};

export type Modules = typeof DEFAULT_MODULES;
