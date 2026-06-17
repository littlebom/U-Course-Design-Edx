import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export default async function AdminUsersPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/courses");
  return <UsersAdmin meId={me.uid} meName={me.name} />;
}
