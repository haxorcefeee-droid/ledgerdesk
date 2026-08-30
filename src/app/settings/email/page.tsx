import { AppShell } from "@/components/shell";
import { Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { saveSmtp } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function EmailSettingsPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const row = await db.get<{ smtp_json: string }>("SELECT smtp_json FROM businesses WHERE id = ?", tenant.business.id);
  let smtp = { host: "", port: "587", user: "", from: "" };
  try {
    smtp = { ...smtp, ...JSON.parse(row?.smtp_json || "{}") };
  } catch {
    // keep defaults
  }
  return (
    <AppShell current="settings">
      <PageHeader title="Email / SMTP" />
      <p className="mb-6 max-w-2xl text-[var(--muted)]">
        Stored per business and used when sending invoices, quotes, and statements. Passwords should be set in the host environment, not in this form.
      </p>
      <form action={saveSmtp} className="max-w-xl space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Host">
          <input className={inputClass} name="host" defaultValue={smtp.host} />
        </Field>
        <Field label="Port">
          <input className={inputClass} name="port" defaultValue={smtp.port} />
        </Field>
        <Field label="Username">
          <input className={inputClass} name="user" defaultValue={smtp.user} />
        </Field>
        <Field label="From address">
          <input className={inputClass} name="from" type="email" defaultValue={smtp.from} />
        </Field>
        <PrimaryButton>Save SMTP</PrimaryButton>
      </form>
    </AppShell>
  );
}
