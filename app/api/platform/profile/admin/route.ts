import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request) {
  const session = await getPlatformSession();

  if (session.role !== "admin" || !session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const displayName = cleanString(body?.displayName);

  if (!displayName) {
    return Response.json({ error: "Admin name is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .upsert(
      {
        display_name: displayName,
        user_id: session.userId,
      },
      { onConflict: "user_id" },
    )
    .select("display_name")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ displayName: data.display_name });
}
