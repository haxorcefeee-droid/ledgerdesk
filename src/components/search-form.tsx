"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inputClass } from "./ui";

function SearchFormInner({
  placeholder,
  href,
}: {
  placeholder: string;
  href?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <form
      className="mb-4"
      onSubmit={(event) => {
        event.preventDefault();
        const q = new FormData(event.currentTarget).get("q");
        if (href) {
          router.push(`${href}?q=${encodeURIComponent(String(q ?? ""))}`);
          return;
        }
        const next = new URLSearchParams(params.toString());
        next.set("q", String(q ?? ""));
        router.push(`?${next.toString()}`);
      }}
    >
      <input className={inputClass} name="q" defaultValue={params.get("q") ?? ""} placeholder={placeholder} />
    </form>
  );
}

export function SearchForm({
  placeholder = "Search",
  href,
}: {
  placeholder?: string;
  href?: string;
}) {
  return (
    <Suspense fallback={<input className={inputClass} placeholder={placeholder} disabled />}>
      <SearchFormInner placeholder={placeholder} href={href} />
    </Suspense>
  );
}
