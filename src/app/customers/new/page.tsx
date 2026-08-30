import { AppShell } from "@/components/shell";
import { Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createCustomer } from "@/lib/actions";

export default function NewCustomerPage() {
  return (
    <AppShell current="customers">
      <PageHeader title="New customer" />
      <form action={createCustomer} className="max-w-xl space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Email">
          <input className={inputClass} name="email" type="email" />
        </Field>
        <Field label="Address">
          <textarea className={inputClass} name="address" rows={3} />
        </Field>
        <Field label="Credit limit">
          <input className={inputClass} name="credit_limit" defaultValue="0" />
        </Field>
        <PrimaryButton>Create customer</PrimaryButton>
      </form>
    </AppShell>
  );
}
