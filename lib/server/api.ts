import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/server";
import type { SessionPayload } from "@/lib/auth/session";
import type { Course } from "@/lib/schema";
import type { Library } from "@/lib/library/schema";

export { prisma };

// ── Auth guard ──────────────────────────────────────────────────────────────
type Guard = { user: SessionPayload } | { res: NextResponse };
export async function requireUser(): Promise<Guard> {
  const user = await getSessionUser();
  if (!user) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { user };
}
export function isGuardFail(g: Guard): g is { res: NextResponse } {
  return "res" in g;
}

// ── Name derivation (mirrors lib/db deriveName) ──────────────────────────────
export function courseName(c: Course): string {
  return (
    c.course.displayName?.trim() ||
    `${c.course.org}/${c.course.courseCode}/${c.course.run}` ||
    "Untitled course"
  );
}
export function libraryName(l: Library): string {
  return l.learningPackage.title?.trim() || "Untitled Library";
}

// ── Prisma row → client record shape (timestamps as unix ms) ─────────────────
type CourseRow = { id: string; name: string; data: unknown; createdAt: Date; updatedAt: Date; deletedAt: Date | null };
type LibraryRow = { id: string; name: string; data: unknown; createdAt: Date; updatedAt: Date; deletedAt: Date | null };

export function toCourseRecord(c: CourseRow) {
  return {
    id: c.id,
    name: c.name,
    course: c.data as Course,
    createdAt: +c.createdAt,
    updatedAt: +c.updatedAt,
    ...(c.deletedAt ? { deletedAt: +c.deletedAt } : {}),
  };
}
export function toLibraryRecord(l: LibraryRow) {
  return {
    id: l.id,
    name: l.name,
    library: l.data as Library,
    createdAt: +l.createdAt,
    updatedAt: +l.updatedAt,
    ...(l.deletedAt ? { deletedAt: +l.deletedAt } : {}),
  };
}

// ── Access control (owner OR shared) ────────────────────────────────────────
export type Role = "owner" | "editor" | "viewer";
export type Need = "view" | "edit";
export type Access<Row> = { ok: true; row: Row; role: Role } | { ok: false; status: 403 | 404 };

function accessFromShare(permission: string | undefined, need: Need): Access<never> | { role: Role } {
  if (!permission) return { ok: false, status: 404 }; // not shared → behave as not found
  if (need === "edit" && permission !== "edit") return { ok: false, status: 403 };
  return { role: permission === "edit" ? "editor" : "viewer" };
}

export async function accessCourse(id: string, userId: string, need: Need) {
  const row = await prisma.course.findUnique({ where: { id } });
  if (!row) return { ok: false as const, status: 404 as const };
  if (row.ownerId === userId) return { ok: true as const, row, role: "owner" as Role };
  const share = await prisma.share.findUnique({
    where: { resourceType_resourceId_sharedWithUserId: { resourceType: "course", resourceId: id, sharedWithUserId: userId } },
  });
  const r = accessFromShare(share?.permission, need);
  if ("ok" in r) return r;
  return { ok: true as const, row, role: r.role };
}

export async function accessLibrary(id: string, userId: string, need: Need) {
  const row = await prisma.library.findUnique({ where: { id } });
  if (!row) return { ok: false as const, status: 404 as const };
  if (row.ownerId === userId) return { ok: true as const, row, role: "owner" as Role };
  const share = await prisma.share.findUnique({
    where: { resourceType_resourceId_sharedWithUserId: { resourceType: "library", resourceId: id, sharedWithUserId: userId } },
  });
  const r = accessFromShare(share?.permission, need);
  if ("ok" in r) return r;
  return { ok: true as const, row, role: r.role };
}

export function denied(status: 403 | 404) {
  return NextResponse.json({ error: status === 403 ? "forbidden" : "not found" }, { status });
}

export async function resolveUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username }, select: { id: true, username: true, name: true } });
}
