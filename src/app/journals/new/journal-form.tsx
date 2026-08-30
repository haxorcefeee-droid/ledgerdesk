"use client";

import { useState } from "react";
import { createJournal } from "@/lib/actions";
import { Field, PrimaryButton, inputClass } from "@/components/ui";
import { todayIso } from "@/lib/money";

type Account = { id: number; code: string; name: string };

export function JournalForm({ accounts }: { accounts: Account[] }) {
  const [rows, setRows] = useState([0, 1]);
  return (
    <form action={createJournal} className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Memo">
          <input className={inputClass} name="memo" defaultValue="Manual journal" />
        </Field>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sans text-[var(--muted)]">
            <tr>
              <th className="py-2 text-left font-medium">Account</th>
              <th className="py-2 text-left font-medium">Debit</th>
              <th className="py-2 text-left font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td className="pr-2 py-1">
                  <select className={inputClass} name="account_id" defaultValue={accounts[0]?.id}>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} {account.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="pr-2 py-1">
                  <input className={inputClass} name="debit" placeholder="0.00" />
                </td>
                <td className="py-1">
                  <input className={inputClass} name="credit" placeholder="0.00" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="sans text-sm text-teal-800 underline"
        onClick={() => setRows((current) => [...current, current.length])}
      >
        Add line
      </button>
      <div>
        <PrimaryButton>Post journal</PrimaryButton>
      </div>
    </form>
  );
}
