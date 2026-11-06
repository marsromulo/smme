import { readSchoolStatusForm } from "@/lib/school-status-uploads";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseSchoolProfileUpdate } from "@/lib/school-profile";

export async function PATCH(request: Request) {
  const session = await getPlatformSession();
  if (!session.userId || !session.email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "school") return Response.json({ error: "Forbidden" }, { status: 403 });

  let updates;
  let submission;
  try {
    submission = await readSchoolStatusForm(request, session.email);
    updates = parseSchoolProfileUpdate(submission.body);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid profile." }, { status: 400 });
  }
  try {
    const supabase = createSupabaseAdminClient();
    await submission.upload();
    const { error } = await supabase.rpc("update_school_profile", {
      account_email: session.email,
      profile: updates,
    });
    if (error) return Response.json({ error: error.message }, { status: error.code === "P0002" ? 404 : 500 });
    return Response.json({ success: true, schoolStatuses: updates.school_statuses });
  } catch {
    return Response.json({ error: "Unable to save school profile." }, { status: 500 });
  }
}
