import { AppShell } from "@/components/shell";
import { Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createBusiness } from "@/lib/auth-actions";

export default function NewBusinessPage() {
  return (
    <AppShell current="settings">
      <PageHeader title="New business" />
      <form action={createBusiness} className="max-w-xl space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Business name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Currency">
          <input className={inputClass} name="currency" defaultValue="USD" required />
        </Field>
        <PrimaryButton>Create and switch</PrimaryButton>
      </form>
    </AppShell>
  );
}
