import { login } from "@/lib/auth-actions";
import { userCount } from "@/lib/tenant";
import { Field, PrimaryButton, inputClass } from "@/components/ui";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if ((await userCount()) === 0) redirect("/setup");
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-xs tracking-[0.2em] text-[var(--muted)] uppercase sans">LedgerDesk</p>
      <h1 className="mt-2 text-4xl">Sign in</h1>
      <p className="mt-3 text-[var(--muted)]">Use your user email and password.</p>
      <form action={login} className="mt-8 space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <input type="hidden" name="next" value={next} />
        <Field label="Email">
          <input className={inputClass} type="email" name="email" required autoFocus />
        </Field>
        <Field label="Password">
          <input className={inputClass} type="password" name="password" required />
        </Field>
        {params.error === "1" ? <p className="text-sm text-[var(--danger)]">That sign-in did not match.</p> : null}
        <PrimaryButton>Open the books</PrimaryButton>
      </form>
      <p className="mt-6 sans text-sm text-[var(--muted)]">
        First user? <Link className="text-teal-800 underline" href="/setup">Create the workspace</Link>
      </p>
    </div>
  );
}
