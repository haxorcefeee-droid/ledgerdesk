import Link from "next/link";

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h2 className="text-3xl">{title}</h2>
      {action}
    </div>
  );
}

export function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="sans rounded-md bg-teal-800 px-4 py-2 text-sm text-[var(--accent-ink)] hover:bg-teal-900"
    >
      {children}
    </Link>
  );
}

export function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="sans rounded-md bg-teal-800 px-4 py-2 text-sm text-[var(--accent-ink)] hover:bg-teal-900"
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="sans mb-1 block text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 sans text-sm outline-none focus:border-teal-700";

export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--panel)]">
      <table className="w-full text-left text-sm">
        <thead className="sans border-b border-[var(--line)] text-[var(--muted)]">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
