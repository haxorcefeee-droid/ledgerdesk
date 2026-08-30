import { AppShell } from "@/components/shell";
import { Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createAccount } from "@/lib/actions";
import { ACCOUNT_TYPES } from "@/lib/types";

export default function NewAccountPage() {
  return (
    <AppShell current="accounts">
      <PageHeader title="New account" />
      <form action={createAccount} className="max-w-xl space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Code">
          <input className={inputClass} name="code" required placeholder="5300" />
        </Field>
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Type">
          <select className={inputClass} name="type" defaultValue="expense">
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <PrimaryButton>Create account</PrimaryButton>
      </form>
    </AppShell>
  );
}
