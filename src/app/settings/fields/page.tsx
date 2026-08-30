import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createCustomField } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function FieldsPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const fields = await db.all<{
    id: number;
    entity: string;
    name: string;
    kind: string;
    placement: string;
    sort_order: number;
  }>("SELECT * FROM custom_fields WHERE business_id = ? ORDER BY entity, sort_order", tenant.business.id);
  return (
    <AppShell current="settings">
      <PageHeader title="Custom fields" />
      <form action={createCustomField} className="mb-10 grid max-w-3xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-3">
        <Field label="Form">
          <HuiSelect
            name="entity"
            value="invoice"
            options={[
              { value: "invoice", label: "Invoice" },
              { value: "quote", label: "Quote" },
              { value: "customer", label: "Customer" },
              { value: "supplier", label: "Supplier" },
              { value: "item", label: "Item" },
            ]}
          />
        </Field>
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Type">
          <HuiSelect
            name="kind"
            value="text"
            options={[
              { value: "text", label: "Text" },
              { value: "paragraph", label: "Paragraph" },
              { value: "dropdown", label: "Dropdown" },
              { value: "image", label: "Image" },
              { value: "date", label: "Date" },
              { value: "number", label: "Number" },
            ]}
          />
        </Field>
        <Field label="Placement">
          <HuiSelect
            name="placement"
            value="header"
            options={[
              { value: "header", label: "Header" },
              { value: "line", label: "Line item" },
            ]}
          />
        </Field>
        <Field label="Order">
          <input className={inputClass} name="sort_order" defaultValue="0" />
        </Field>
        <Field label="Dropdown options (comma)">
          <input className={inputClass} name="options" />
        </Field>
        <div className="md:col-span-3">
          <PrimaryButton>Add field</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Form", "Name", "Type", "Placement", "Order"]}>
        {fields.map((field) => (
          <tr key={field.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{field.entity}</td>
            <td className="px-4 py-3">{field.name}</td>
            <td className="px-4 py-3">{field.kind}</td>
            <td className="px-4 py-3">{field.placement}</td>
            <td className="px-4 py-3 sans">{field.sort_order}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
