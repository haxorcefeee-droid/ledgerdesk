import { AppShell } from "@/components/shell";
import { ButtonLink, DataTable, PageHeader } from "@/components/ui";
import { listCustomers } from "@/lib/queries";

export default function CustomersPage() {
  const customers = listCustomers();
  return (
    <AppShell current="customers">
      <PageHeader title="Customers" action={<ButtonLink href="/customers/new">New customer</ButtonLink>} />
      <DataTable headers={["Name", "Email", "Address"]}>
        {customers.map((customer) => (
          <tr key={customer.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{customer.name}</td>
            <td className="px-4 py-3 sans">{customer.email}</td>
            <td className="px-4 py-3">{customer.address}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
