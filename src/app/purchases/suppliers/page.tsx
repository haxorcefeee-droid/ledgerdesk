import Link from "next/link";
import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { SearchForm } from "@/components/search-form";
import { createParty } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const tenant = await requireTenant();
  const q = (await searchParams).q?.trim() ?? "";
  const db = await getDb();
  const parties = await db.all<{ id: number; name: string; email: string; address: string; currency: string }>(
    `SELECT * FROM parties WHERE business_id = ? AND kind = 'supplier'
     AND (? = '' OR name LIKE ? OR email LIKE ?) ORDER BY name`,
    tenant.business.id,
    q,
    `%${q}%`,
    `%${q}%`,
  );
  return (
    <AppShell current="suppliers">
      <PageHeader title="Suppliers" />
      <SearchForm placeholder="Search suppliers" />
      <form action={createParty} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <input type="hidden" name="kind" value="supplier" />
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Email">
          <input className={inputClass} name="email" type="email" />
        </Field>
        <Field label="Address">
          <input className={inputClass} name="address" />
        </Field>
        <Field label="Currency">
          <input className={inputClass} name="currency" defaultValue={tenant.business.currency} />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Add supplier</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Name", "Email", "Address", "Statement"]}>
        {parties.map((party) => (
          <tr key={party.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{party.name}</td>
            <td className="px-4 py-3 sans">{party.email}</td>
            <td className="px-4 py-3">{party.address}</td>
            <td className="px-4 py-3">
              <Link className="text-teal-800 underline" href={`/reports/statements?party=${party.id}`}>
                Statement
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
