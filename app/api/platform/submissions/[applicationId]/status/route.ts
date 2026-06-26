import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const session = await getPlatformSession();

  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const status = cleanString((body as Record<string, unknown> | null)?.status);

  if (status !== "rejected" && status !== "reopen") {
    return Response.json({ error: "Status must be rejected or reopen." }, { status: 400 });
  }

  const routeParams = (await params) as { applicationId?: string };
  const applicationId = routeParams.applicationId;

  if (!applicationId) {
    return Response.json({ error: "Application is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: application, error: applicationError } = await supabase
    .from("service_applications")
    .select("school_user_id, service_id")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return Response.json({ error: "Application was not found." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("service_applications")
    .update({ status: status === "rejected" ? "rejected" : "in_progress" })
    .eq("school_user_id", application.school_user_id)
    .eq("service_id", application.service_id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
