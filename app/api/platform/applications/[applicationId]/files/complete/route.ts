import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cleanString, jsonAuthError, requirePlatformSchool } from "../../../helpers";

export const runtime = "nodejs";

function parseFileIds(body: unknown): { fileIds?: string[]; error?: string } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const fileIds = Array.isArray(record.fileIds)
    ? Array.from(new Set(record.fileIds.map((fileId) => cleanString(fileId)).filter(Boolean)))
    : [];

  if (fileIds.length === 0) {
    return { error: "No uploaded files were provided." };
  }

  return { fileIds };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const auth = await requirePlatformSchool();

  if ("error" in auth) {
    return jsonAuthError(auth.error);
  }

  const { applicationId } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseFileIds(body);

  if (parsed.error || !parsed.fileIds) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: application, error: applicationError } = await supabase
      .from("service_applications")
      .select("id")
      .eq("id", applicationId)
      .eq("school_user_id", auth.userId)
      .single();

    if (applicationError || !application) {
      return Response.json({ error: "Application was not found." }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("service_application_files")
      .update({ upload_status: "uploaded", uploaded_at: new Date().toISOString() })
      .eq("application_id", applicationId)
      .in("id", parsed.fileIds);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to finalize uploads.";
    return Response.json({ error: message }, { status: 500 });
  }
}
