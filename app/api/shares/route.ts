import { NextResponse } from "next/server";
import {
  prisma, requireUser, isGuardFail, accessCourse, accessLibrary, resolveUserByUsername,
} from "@/lib/server/api";

export const runtime = "nodejs";

async function ownsResource(resourceType: string, resourceId: string, userId: string): Promise<boolean> {
  if (resourceType === "course") {
    const a = await accessCourse(resourceId, userId, "edit");
    return a.ok && a.role === "owner";
  }
  if (resourceType === "library") {
    const a = await accessLibrary(resourceId, userId, "edit");
    return a.ok && a.role === "owner";
  }
  return false;
}

// GET /api/shares?resourceType=&resourceId=  → list shares (owner only)
export async function GET(req: Request) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const url = new URL(req.url);
  const resourceType = url.searchParams.get("resourceType") || "";
  const resourceId = url.searchParams.get("resourceId") || "";
  if (!(await ownsResource(resourceType, resourceId, g.user.uid))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const shares = await prisma.share.findMany({ where: { resourceType, resourceId } });
  const users = await prisma.user.findMany({
    where: { id: { in: shares.map((s) => s.sharedWithUserId) } },
    select: { id: true, username: true, name: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s.id,
      permission: s.permission,
      username: byId.get(s.sharedWithUserId)?.username ?? "(ลบแล้ว)",
      name: byId.get(s.sharedWithUserId)?.name ?? "",
    })),
  });
}

// POST /api/shares { resourceType, resourceId, username, permission }  (owner only)
export async function POST(req: Request) {
  const g = await requireUser();
  if (isGuardFail(g)) return g.res;
  const body = await req.json().catch(() => ({}));
  const resourceType = body.resourceType === "library" ? "library" : "course";
  const resourceId = typeof body.resourceId === "string" ? body.resourceId : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const permission = body.permission === "view" ? "view" : "edit";
  if (!resourceId || !username) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  if (!(await ownsResource(resourceType, resourceId, g.user.uid))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const target = await resolveUserByUsername(username);
  if (!target) return NextResponse.json({ error: `ไม่พบผู้ใช้ "${username}"` }, { status: 404 });
  if (target.id === g.user.uid) return NextResponse.json({ error: "แชร์ให้ตัวเองไม่ได้" }, { status: 400 });
  const share = await prisma.share.upsert({
    where: { resourceType_resourceId_sharedWithUserId: { resourceType, resourceId, sharedWithUserId: target.id } },
    create: { resourceType, resourceId, ownerId: g.user.uid, sharedWithUserId: target.id, permission },
    update: { permission },
  });
  return NextResponse.json({ share: { id: share.id, username: target.username, name: target.name, permission } }, { status: 201 });
}
