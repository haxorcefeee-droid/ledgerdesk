import { setupAccount } from "@/lib/auth-actions";
import { userCount } from "@/lib/tenant";
import { Field, PrimaryButton, inputClass } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function SetupPage() {
  if ((await userCount()) > 0) redirect("/login");
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="text-xs tracking-[0.2em] text-[var(--muted)] uppercase sans">LedgerDesk</p>
      <h1 className="mt-2 text-4xl">Create the workspace</h1>
      <p className="mt-3 text-[var(--muted)]">The first user is the owner and can add businesses and teammates.</p>
      <form action={setupAccount} className="mt-8 space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Your name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" name="email" required />
        </Field>
        <Field label="Password">
          <input className={inputClass} type="password" name="password" minLength={8} required />
        </Field>
        <Field label="First business">
          <input className={inputClass} name="business_name" required defaultValue="North Pine Studio" />
        </Field>
        <PrimaryButton>Create workspace</PrimaryButton>
      </form>
    </div>
  );
}
