import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { schoolAccessAllowed } from "./school-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformRole = "admin" | "school";

export type PlatformSession = {
  email: string | null;
  name: string | null;
  role: PlatformRole;
  userId: string | null;
};

export async function getPlatformSession(): Promise<PlatformSession> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims) {
      return {
        email: null,
        name: null,
        role: "school",
        userId: null,
      };
    }

    // Read current server-managed metadata: an existing JWT may predate deactivation.
    const { data: current, error: currentError } = await createSupabaseAdminClient().auth.admin.getUserById(data.claims.sub);
    if (currentError || !current.user) throw new Error("Session unavailable");
    const user = current.user;
    if (user.app_metadata.role !== "admin" && !schoolAccessAllowed(user.app_metadata, user.banned_until)) {
      throw new Error("School account is inactive or awaiting approval");
    }
    const metadata = user.user_metadata;
    const role = user.app_metadata?.role === "admin" ? "admin" : "school";
    const name =
      typeof metadata?.name === "string"
        ? metadata.name
        : typeof metadata?.full_name === "string"
          ? metadata.full_name
          : null;

    return {
      email: data.claims.email ?? null,
      name,
      role,
      userId: data.claims.sub,
    };
  } catch {
    return {
      email: null,
      name: null,
      role: "school",
      userId: null,
    };
  }
}
