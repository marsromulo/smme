import { getPlatformSession } from "@/lib/platform/auth";
import { PlatformWorkspaceShell } from "../components/PlatformWorkspaceShell";

export default async function PlatformWorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getPlatformSession();

  return (
    <PlatformWorkspaceShell
      email={session.email}
      name={session.name}
      role={session.role}
      userId={session.userId}
    >
      {children}
    </PlatformWorkspaceShell>
  );
}
