"use client";

import { useState } from "react";
import { createInvoice } from "@/lib/actions";
import { Field, PrimaryButton, inputClass } from "@/components/ui";
import { todayIso } from "@/lib/money";

type Customer = { id: number; name: string };
type Account = { id: number; code: string; name: string };

export function InvoiceForm({
  customers,
  incomeAccounts,
}: {
  customers: Customer[];
  incomeAccounts: Account[];
}) {
  const [rows, setRows] = useState([0]);
  return (
    <form action={createInvoice} className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Customer">
          <select className={inputClass} name="customer_id" required>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Due date">
          <input className={inputClass} type="date" name="due_date" />
        </Field>
      </div>
      {rows.map((row) => (
        <div key={row} className="grid gap-3 md:grid-cols-4">
          <Field label="Description">
            <input className={inputClass} name="line_description" required />
          </Field>
          <Field label="Qty">
            <input className={inputClass} name="line_qty" defaultValue="1" />
          </Field>
          <Field label="Unit price">
            <input className={inputClass} name="line_unit" required placeholder="0.00" />
          </Field>
          <Field label="Income account">
            <select className={inputClass} name="line_income_id" defaultValue={incomeAccounts[0]?.id}>
              {incomeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ))}
      <button
        type="button"
        className="sans text-sm text-teal-800 underline"
        onClick={() => setRows((current) => [...current, current.length])}
      >
        Add line
      </button>
      <Field label="Notes">
        <textarea className={inputClass} name="notes" rows={2} />
      </Field>
      <PrimaryButton>Save draft</PrimaryButton>
    </form>
  );
}
