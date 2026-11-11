import { getPlatformSession } from "@/lib/platform/auth";
import { schoolBanDuration } from "@/lib/platform/school-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getPlatformSession();
  if (!session.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body.active !== "boolean") return Response.json({ error: "Choose Active or Inactive." }, { status: 400 });
  const { userId } = await params;
  const db = createSupabaseAdminClient();
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data.user) return Response.json({ error: "School account not found." }, { status: 404 });
  if (data.user.app_metadata.role !== "school") return Response.json({ error: "Only school accounts can be changed here." }, { status: 400 });
  const { error: updateError } = await db.auth.admin.updateUserById(userId, {
    app_metadata: { ...data.user.app_metadata, account_active: body.active, access_updated_by: session.userId, access_updated_at: new Date().toISOString() },
    ban_duration: schoolBanDuration(body.active, data.user.app_metadata.account_status),
  });
  if (updateError) return Response.json({ error: "Unable to update school account access." }, { status: 500 });
  return Response.json({ active: body.active });
}
