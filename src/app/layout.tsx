import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { cookies } from "next/headers";
import { hasPostgresUrl } from "@/lib/database-url";
import { optionalTenant } from "@/lib/tenant";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "LedgerDesk",
  description: "Original double-entry bookkeeping for one or more businesses.",
};

export const dynamic = "force-dynamic";

function MissingDatabase() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <h1 className="text-3xl">Database not connected</h1>
      <p className="mt-4 text-[var(--muted)]">
        Add a Neon database so <span className="sans">DATABASE_URL</span> or{" "}
        <span className="sans">POSTGRES_URL</span> is set, then redeploy.
      </p>
    </div>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const missingDatabase = Boolean(process.env.VERCEL) && !hasPostgresUrl();
  let tenant = null;
  try {
    tenant = missingDatabase ? null : await optionalTenant();
  } catch {
    tenant = null;
  }
  const themeCookie = (await cookies()).get("ledgerdesk_theme")?.value;
  const theme = tenant?.business.theme || themeCookie || "light";
  const dir = tenant?.business.direction === "rtl" ? "rtl" : "ltr";
  const locale = tenant?.business.locale || "en";
  return (
    <html lang={locale} dir={dir} className={theme === "dark" ? "dark" : ""}>
      <body className={`${serif.variable} ${sans.variable} antialiased`}>
        {missingDatabase ? <MissingDatabase /> : children}
      </body>
    </html>
  );
}
