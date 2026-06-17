import { HubShell } from "@/components/HubShell";
import { getSessionUser } from "@/lib/auth/server";

export default async function LibrariesLayout({ children }: { children: React.ReactNode }) {
  const me = await getSessionUser();
  return (
    <HubShell role={me?.role ?? "user"} name={me?.name ?? ""}>
      {children}
    </HubShell>
  );
}
