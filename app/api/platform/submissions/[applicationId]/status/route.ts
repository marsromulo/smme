import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanNotes(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeReviewStatus(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "pending";
}

async function hasAllRequiredDocumentsApproved({
  schoolUserId,
  serviceId,
  supabase,
}: {
  schoolUserId: string;
  serviceId: string;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}) {
  const { data: requiredDocuments, error: requiredDocumentsError } = await supabase
    .from("service_required_documents")
    .select("id")
    .eq("service_id", serviceId);

  if (requiredDocumentsError || !requiredDocuments || requiredDocuments.length === 0) {
    return false;
  }

  const { data: applications, error: applicationsError } = await supabase
    .from("service_applications")
    .select("id")
    .eq("school_user_id", schoolUserId)
    .eq("service_id", serviceId);

  if (applicationsError || !applications || applications.length === 0) {
    return false;
  }

  const applicationIds = applications.map((application) => application.id);
  const { data: files, error: filesError } = await supabase
    .from("service_application_files")
    .select("service_required_document_id, review_status, upload_status")
    .in("application_id", applicationIds);

  if (filesError || !files) {
    return false;
  }

  return requiredDocuments.every((document) => {
    const activeFiles = files.filter(
      (file) =>
        file.upload_status === "uploaded" &&
        file.service_required_document_id === document.id &&
        normalizeReviewStatus(file.review_status) !== "invalid",
    );

    return (
      activeFiles.length > 0 &&
      activeFiles.every((file) => normalizeReviewStatus(file.review_status) === "approved")
    );
  });
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

  const bodyRecord = body as Record<string, unknown> | null;
  const status = cleanString(bodyRecord?.status);
  const adminNotes = cleanNotes(bodyRecord?.adminNotes);

  if (status !== "approved" && status !== "rejected" && status !== "reopen") {
    return Response.json({ error: "Status must be approved, rejected, or reopen." }, { status: 400 });
  }

  const routeParams = (await params) as { applicationId?: string };
  const applicationId = routeParams.applicationId;

  if (!applicationId) {
    return Response.json({ error: "Application is required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: application, error: applicationError } = await supabase
    .from("service_applications")
    .select("school_user_id, service_id, status")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return Response.json({ error: "Application was not found." }, { status: 404 });
  }

  const canApprove =
    application.status === "for_final_approval" ||
    (status === "approved" &&
      (await hasAllRequiredDocumentsApproved({
        schoolUserId: application.school_user_id,
        serviceId: application.service_id,
        supabase,
      })));

  if (status === "approved" && !canApprove) {
    return Response.json(
      { error: "Application can only be approved when it is For Final Approval." },
      { status: 400 },
    );
  }

  if (status === "reopen" && application.status !== "approved" && application.status !== "rejected") {
    return Response.json(
      { error: "Application can only be reopened when it is approved or rejected." },
      { status: 400 },
    );
  }

  if (status === "reopen" && !adminNotes) {
    return Response.json({ error: "Reopening note is required." }, { status: 400 });
  }

  const updatePayload =
    status === "approved"
      ? {
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.userId,
          status: "approved",
        }
      : status === "reopen"
        ? {
            admin_notes: adminNotes,
            reviewed_at: new Date().toISOString(),
            reviewed_by: session.userId,
            status: application.status === "approved" ? "for_final_approval" : "in_progress",
          }
      : {
          status: status === "rejected" ? "rejected" : "in_progress",
        };

  const { error: updateError } = await supabase
    .from("service_applications")
    .update(updatePayload)
    .eq("school_user_id", application.school_user_id)
    .eq("service_id", application.service_id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
