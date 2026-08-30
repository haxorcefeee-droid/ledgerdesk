import Link from "next/link";
import { AppShell } from "@/components/shell";
import { Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect, HuiSwitch } from "@/components/hui";
import { createDivision } from "@/lib/extra-actions";
import { updateBusiness } from "@/lib/actions";
import { MODULES } from "@/lib/modules";
import { requireTenant } from "@/lib/tenant";
import { getDb } from "@/lib/db";

const LINKS = [
  { href: "/settings/users", label: "Users & roles" },
  { href: "/settings/permissions", label: "Permissions" },
  { href: "/settings/tax", label: "Tax codes" },
  { href: "/settings/currencies", label: "Currencies" },
  { href: "/settings/fields", label: "Custom fields" },
  { href: "/settings/email", label: "Email / SMTP" },
  { href: "/settings/tokens", label: "Access tokens" },
  { href: "/settings/recurring", label: "Recurring" },
  { href: "/settings/defaults", label: "Form defaults" },
  { href: "/settings/extensions", label: "Extensions" },
  { href: "/accounts/opening", label: "Starting balances" },
  { href: "/businesses/new", label: "New business" },
];

export default async function SettingsPage() {
  const tenant = await requireTenant();
  const business = tenant.business;
  const db = await getDb();
  const divisions = await db.all<{ id: number; name: string; code: string }>(
    "SELECT * FROM divisions WHERE business_id = ? ORDER BY name",
    business.id,
  );
  return (
    <AppShell current="settings">
      <PageHeader title="Settings" />
      <div className="mb-8 flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="sans rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:border-teal-700">
            {link.label}
          </Link>
        ))}
      </div>
      <form action={updateBusiness} className="mb-10 max-w-xl space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Name">
          <input className={inputClass} name="name" defaultValue={business.name} required />
        </Field>
        <Field label="Currency (ISO)">
          <input className={inputClass} name="currency" defaultValue={business.currency} required />
        </Field>
        <Field label="Fiscal year start (MM-DD)">
          <input className={inputClass} name="fiscal_year_start" defaultValue={business.fiscal_year_start} required />
        </Field>
        <Field label="Lock date (closed periods)">
          <input className={inputClass} type="date" name="lock_date" defaultValue={business.lock_date ?? ""} />
        </Field>
        <Field label="Locale">
          <input className={inputClass} name="locale" defaultValue={business.locale} />
        </Field>
        <Field label="Date format">
          <input className={inputClass} name="date_format" defaultValue={business.date_format} />
        </Field>
        <Field label="Number format">
          <input className={inputClass} name="number_format" defaultValue={business.number_format} />
        </Field>
        <Field label="Invoice theme">
          <HuiSelect
            name="invoice_theme"
            value={business.invoice_theme || "classic"}
            options={[
              { value: "classic", label: "Classic" },
              { value: "modern", label: "Modern" },
              { value: "minimal", label: "Minimal" },
            ]}
          />
        </Field>
        <Field label="Theme">
          <HuiSelect
            name="theme"
            value={business.theme || "light"}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </Field>
        <Field label="Text direction">
          <HuiSelect
            name="direction"
            value={business.direction || "ltr"}
            options={[
              { value: "ltr", label: "Left to right" },
              { value: "rtl", label: "Right to left" },
            ]}
          />
        </Field>
        <Field label="Document footer / terms">
          <textarea className={inputClass} name="footer_text" rows={3} defaultValue={business.footer_text} />
        </Field>
        <fieldset className="space-y-2">
          <legend className="sans mb-2 text-sm text-[var(--muted)]">Enabled modules</legend>
          {MODULES.map((module) => (
            <HuiSwitch
              key={module.key}
              name={`module_${module.key}`}
              defaultChecked={business.modules[module.key] !== false}
              label={module.label}
            />
          ))}
        </fieldset>
        <PrimaryButton>Save settings</PrimaryButton>
      </form>

      <h3 className="mb-3 text-xl">Divisions</h3>
      <form action={createDivision} className="mb-6 grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Code">
          <input className={inputClass} name="code" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Add division</PrimaryButton>
        </div>
      </form>
      <ul className="sans text-sm text-[var(--muted)]">
        {divisions.map((division) => (
          <li key={division.id}>
            {division.code} {division.name}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
