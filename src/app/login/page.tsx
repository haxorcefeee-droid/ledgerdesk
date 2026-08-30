import { login } from "@/lib/auth-actions";
import { isAuthEnabled } from "@/lib/auth";
import { Field, PrimaryButton, inputClass } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";
  const error = params.error;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-xs tracking-[0.2em] text-[var(--muted)] uppercase sans">LedgerDesk</p>
      <h1 className="mt-2 text-4xl">Sign in</h1>
      <p className="mt-3 text-[var(--muted)]">The books are private. Enter the workspace password.</p>
      {!isAuthEnabled() ? (
        <p className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 text-sm">
          Set <span className="sans">LEDGERDESK_PASSWORD</span> in the Vercel project environment to enable the lock.
        </p>
      ) : (
        <form action={login} className="mt-8 space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
          <input type="hidden" name="next" value={next} />
          <Field label="Password">
            <input className={inputClass} type="password" name="password" autoFocus required />
          </Field>
          {error === "1" ? <p className="text-sm text-[var(--danger)]">That password did not match.</p> : null}
          {error === "setup" ? (
            <p className="text-sm text-[var(--danger)]">LEDGERDESK_PASSWORD is not configured.</p>
          ) : null}
          <PrimaryButton>Open the books</PrimaryButton>
        </form>
      )}
    </div>
  );
}
