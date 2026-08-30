import { NextResponse } from "next/server";
import { runRecurringJob } from "@/lib/extra-actions";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runRecurringJob();
  return NextResponse.json(result);
}
