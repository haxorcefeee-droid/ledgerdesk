import { AppShell } from "@/components/shell";
import { Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { updateBusiness } from "@/lib/actions";
import { getBusiness } from "@/lib/queries";

export default function SettingsPage() {
  const business = getBusiness();
  return (
    <AppShell current="settings">
      <PageHeader title="Business" />
      <form action={updateBusiness} className="max-w-xl space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Name">
          <input className={inputClass} name="name" defaultValue={business.name} required />
        </Field>
        <Field label="Currency (ISO)">
          <input className={inputClass} name="currency" defaultValue={business.currency} required />
        </Field>
        <Field label="Fiscal year start (MM-DD)">
          <input className={inputClass} name="fiscal_year_start" defaultValue={business.fiscal_year_start} required />
        </Field>
        <fieldset className="sans text-sm">
          <legend className="mb-2 text-[var(--muted)]">Visible modules</legend>
          <label className="mr-4">
            <input type="checkbox" name="module_cash" defaultChecked={business.modules.cash} /> Cash
          </label>
          <label className="mr-4">
            <input type="checkbox" name="module_customers" defaultChecked={business.modules.customers} /> Customers
          </label>
          <label className="mr-4">
            <input type="checkbox" name="module_invoices" defaultChecked={business.modules.invoices} /> Invoices
          </label>
          <label>
            <input type="checkbox" name="module_reports" defaultChecked={business.modules.reports} /> Reports
          </label>
        </fieldset>
        <PrimaryButton>Save</PrimaryButton>
      </form>
    </AppShell>
  );
}
