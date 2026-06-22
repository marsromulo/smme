import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "../../school-registrations/helpers";

export async function GET() {
  const auth = await requirePlatformAdmin();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.error === "Forbidden" ? 403 : 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ count: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications.";
    return Response.json({ error: message }, { status: 500 });
  }
}
