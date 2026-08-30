"use client";

import { switchBusiness } from "@/lib/auth-actions";

export function BusinessSwitcher({
  currentId,
  businesses,
}: {
  currentId: number;
  businesses: Array<{ id: number; name: string }>;
}) {
  return (
    <form action={switchBusiness}>
      <label className="sans text-xs text-[var(--muted)]">Business</label>
      <select
        name="business_id"
        defaultValue={currentId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-2 sans text-sm text-[var(--ink)] dark:bg-stone-900"
      >
        {businesses.map((biz) => (
          <option key={biz.id} value={biz.id}>
            {biz.name}
          </option>
        ))}
      </select>
    </form>
  );
}
