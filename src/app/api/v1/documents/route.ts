import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  const db = await getDb();
  const row = await db.get<{ business_id: number }>("SELECT business_id FROM access_tokens WHERE token_hash = ?", token);
  if (!row) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const documents = await db.all(
    "SELECT id, kind, number, date, status FROM documents WHERE business_id = ? ORDER BY date DESC LIMIT 100",
    row.business_id,
  );
  return NextResponse.json({ documents });
}
