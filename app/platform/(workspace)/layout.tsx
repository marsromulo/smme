import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PlatformWorkspaceShell } from "../components/PlatformWorkspaceShell";

async function getSchoolNameByContactEmail(email: string | null) {
  if (!email) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("schools")
      .select("school_name")
      .eq("representative_email", email)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Unable to load school name for workspace shell:", error.message);
      return null;
    }

    return typeof data?.school_name === "string" ? data.school_name : null;
  } catch (error) {
    console.error(
      "Unable to load school name for workspace shell:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function getAdminDisplayName(userId: string | null) {
  if (!userId) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Unable to load admin profile for workspace shell:", error.message);
      return null;
    }

    return typeof data?.display_name === "string" ? data.display_name : null;
  } catch (error) {
    console.error(
      "Unable to load admin profile for workspace shell:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export default async function PlatformWorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getPlatformSession();
  const schoolName = session.role === "school" ? await getSchoolNameByContactEmail(session.email) : null;
  const adminDisplayName = session.role === "admin" ? await getAdminDisplayName(session.userId) : null;

  return (
    <PlatformWorkspaceShell
      email={session.email}
      name={adminDisplayName ?? session.name}
      role={session.role}
      schoolName={schoolName}
      userId={session.userId}
    >
      {children}
    </PlatformWorkspaceShell>
  );
}
