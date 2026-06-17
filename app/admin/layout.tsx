import { HubShell } from "@/components/HubShell";
import { getSessionUser } from "@/lib/auth/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getSessionUser();
  return (
    <HubShell role={me?.role ?? "user"} name={me?.name ?? ""}>
      {children}
    </HubShell>
  );
}
