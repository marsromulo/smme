import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlatformSession } from "@/lib/platform/auth";

export async function GET() {
  const session = await getPlatformSession();

  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const query =
      session.role === "admin"
        ? supabase
            .from("admin_notifications")
            .select("id", { count: "exact", head: true })
            .eq("is_read", false)
        : supabase
            .from("school_notifications")
            .select("id", { count: "exact", head: true })
            .eq("recipient_user_id", session.userId)
            .eq("is_read", false);

    const { count, error } = await query;

    if (error) {
      if (
        session.role === "school" &&
        error.message.includes("schema cache") &&
        error.message.includes("school_notifications")
      ) {
        return Response.json({ count: 0 });
      }

      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ count: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications.";
    return Response.json({ error: message }, { status: 500 });
  }
}
