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

    const metadata = data.claims.user_metadata;
    const role = data.claims.app_metadata?.role === "admin" ? "admin" : "school";
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
