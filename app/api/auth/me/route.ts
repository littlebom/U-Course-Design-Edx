import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { username: me.username, name: me.name, role: me.role } });
}
