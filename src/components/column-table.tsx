"use client";

import { useMemo, useState } from "react";
import { HuiMenu } from "./hui";

export function ColumnTable({
  columns,
  rows,
}: {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number>>;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [asc, setAsc] = useState(true);
  const visible = columns.filter((column) => !hidden.includes(column.key));
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const left = a[sortKey] ?? "";
      const right = b[sortKey] ?? "";
      if (left < right) return asc ? -1 : 1;
      if (left > right) return asc ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, asc]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <HuiMenu
          label="Columns"
          items={columns.map((column) => ({
            label: hidden.includes(column.key) ? `Show ${column.label}` : `Hide ${column.label}`,
            onClick: () =>
              setHidden((current) =>
                current.includes(column.key) ? current.filter((key) => key !== column.key) : [...current, column.key],
              ),
          }))}
        />
        <button
          type="button"
          className="sans rounded-md border border-[var(--line)] px-3 py-2 text-sm"
          onClick={() => {
            const header = visible.map((column) => column.label).join("\t");
            const body = sorted
              .map((row) => visible.map((column) => String(row[column.key] ?? "")).join("\t"))
              .join("\n");
            void navigator.clipboard.writeText(`${header}\n${body}`);
          }}
        >
          Copy to clipboard
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--panel)]">
        <table className="w-full text-left text-sm">
          <thead className="sans border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              {visible.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setAsc(sortKey === column.key ? !asc : true);
                      setSortKey(column.key);
                    }}
                  >
                    {column.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr key={index} className="border-t border-[var(--line)]">
                {visible.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
