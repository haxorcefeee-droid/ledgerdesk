"use client";

import { useState } from "react";
import { Field, inputClass } from "./ui";
import { HuiSelect } from "./hui";

export function DocumentLines({
  accounts,
  defaultAccountId,
}: {
  accounts: Array<{ id: number; code: string; name: string }>;
  defaultAccountId: string;
}) {
  const [rows, setRows] = useState([0]);
  const [showDesc, setShowDesc] = useState(true);
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="sans text-sm text-teal-800 underline"
        onClick={() => setShowDesc((value) => !value)}
      >
        {showDesc ? "Hide line descriptions" : "Show line descriptions"}
      </button>
      {rows.map((row) => (
        <div key={row} className="grid gap-3 md:grid-cols-4">
          {showDesc ? (
            <Field label="Description">
              <input className={inputClass} name="line_description" required={row === 0} />
            </Field>
          ) : (
            <input type="hidden" name="line_description" value="Line" />
          )}
          <Field label="Qty">
            <input className={inputClass} name="line_qty" defaultValue="1" />
          </Field>
          <Field label="Unit">
            <input className={inputClass} name="line_unit" required={row === 0} placeholder="0.00" />
          </Field>
          <Field label="Account">
            <HuiSelect
              name="line_account_id"
              value={defaultAccountId}
              options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
            />
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
    </div>
  );
}
