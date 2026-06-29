import { deleteR2Object } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cleanString, jsonAuthError, requirePlatformSchool } from "../../../applications/helpers";

export const runtime = "nodejs";

type ApplicationStatus =
  | "new"
  | "in_progress"
  | "for_endorsement"
  | "for_final_approval"
  | "approved"
  | "rejected";
type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit" | "invalid";

function normalizeApplicationStatus(value: string): ApplicationStatus {
  if (value === "approved") {
    return "approved";
  }

  if (value === "for_final_approval") {
    return "for_final_approval";
  }

  if (value === "for_endorsement") {
    return "for_endorsement";
  }

  if (value === "rejected") {
    return "rejected";
  }

  if (value === "in_progress") {
    return "in_progress";
  }

  return "new";
}

function normalizeReviewStatus(value: string): ReviewStatus {
  if (value === "approved" || value === "rejected" || value === "resubmit" || value === "invalid") {
    return value;
  }

  return "pending";
}

async function syncGroupedApplicationStatus({
  application,
  supabase,
}: {
  application: {
    school_user_id: string;
    service_id: string;
  };
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}): Promise<ApplicationStatus | null> {
  const { data: applications, error: applicationsError } = await supabase
    .from("service_applications")
    .select("id, status")
    .eq("school_user_id", application.school_user_id)
    .eq("service_id", application.service_id);

  if (applicationsError || !applications) {
    console.error("Unable to load grouped applications for status sync:", applicationsError?.message);
    return null;
  }

  if (applications.some((item) => normalizeApplicationStatus(item.status) === "rejected")) {
    return "rejected";
  }

  if (applications.some((item) => normalizeApplicationStatus(item.status) === "approved")) {
    return "approved";
  }

  const applicationIds = applications.map((item) => item.id);
  const [{ data: requiredDocuments }, { data: files }] = await Promise.all([
    supabase.from("service_required_documents").select("id").eq("service_id", application.service_id),
    supabase
      .from("service_application_files")
      .select("service_required_document_id, review_status, upload_status")
      .in("application_id", applicationIds.length > 0 ? applicationIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const uploadedFiles = (files ?? []).filter((row) => row.upload_status === "uploaded");
  const activeUploadedFiles = uploadedFiles.filter(
    (uploadedFile) => normalizeReviewStatus(uploadedFile.review_status) !== "invalid",
  );
  const documentIds = (requiredDocuments ?? []).map((document) => document.id);
  let nextStatus: ApplicationStatus = "new";

  if (
    documentIds.length > 0 &&
    documentIds.every((documentId) => {
      const assignedFiles = activeUploadedFiles.filter(
        (uploadedFile) => uploadedFile.service_required_document_id === documentId,
      );

      return (
        assignedFiles.length > 0 &&
        assignedFiles.every((assignedFile) => normalizeReviewStatus(assignedFile.review_status) === "approved")
      );
    })
  ) {
    nextStatus = "for_endorsement";
  } else if (activeUploadedFiles.some((uploadedFile) => Boolean(uploadedFile.service_required_document_id))) {
    nextStatus = "in_progress";
  }

  const { error: updateStatusError } = await supabase
    .from("service_applications")
    .update({ status: nextStatus })
    .in("id", applicationIds);

  if (updateStatusError) {
    console.error("Unable to sync grouped application status:", updateStatusError.message);
    return null;
  }

  return nextStatus;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const auth = await requirePlatformSchool();

  if ("error" in auth) {
    return jsonAuthError(auth.error);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const serviceRequiredDocumentId = cleanString(record.serviceRequiredDocumentId);

  if (!serviceRequiredDocumentId) {
    return Response.json({ error: "Select a required document before saving." }, { status: 400 });
  }

  const { fileId } = await params;
  const supabase = createSupabaseAdminClient();

  try {
    const { data: file, error: fileError } = await supabase
      .from("service_application_files")
      .select(
        "id, application_id, original_name, mime_type, size_bytes, upload_status, review_status, service_required_document_id, created_at, uploaded_at",
      )
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return Response.json({ error: "File was not found." }, { status: 404 });
    }

    if (file.upload_status !== "uploaded") {
      return Response.json({ error: "Only uploaded files can be assigned." }, { status: 400 });
    }

    if (normalizeReviewStatus(file.review_status) !== "pending") {
      return Response.json(
        { error: "Only documents still waiting for admin review can be reassigned." },
        { status: 400 },
      );
    }

    const { data: application, error: applicationError } = await supabase
      .from("service_applications")
      .select("id, school_user_id, service_id, status")
      .eq("id", file.application_id)
      .eq("school_user_id", auth.userId)
      .single();

    if (applicationError || !application) {
      return Response.json({ error: "Application was not found." }, { status: 404 });
    }

    const applicationStatus = normalizeApplicationStatus(application.status);

    if (
      applicationStatus === "for_endorsement" ||
      applicationStatus === "for_final_approval" ||
      applicationStatus === "approved" ||
      applicationStatus === "rejected"
    ) {
      return Response.json(
        { error: "This application is already locked for review and can no longer be edited by the school." },
        { status: 400 },
      );
    }

    const { data: requirement, error: requirementError } = await supabase
      .from("service_required_documents")
      .select("id")
      .eq("id", serviceRequiredDocumentId)
      .eq("service_id", application.service_id)
      .single();

    if (requirementError || !requirement) {
      return Response.json(
        { error: "Selected required document does not belong to this service." },
        { status: 400 },
      );
    }

    const { data: updatedFile, error: updateError } = await supabase
      .from("service_application_files")
      .update({ service_required_document_id: serviceRequiredDocumentId })
      .eq("id", fileId)
      .select(
        "id, original_name, mime_type, size_bytes, review_status, service_required_document_id, created_at, uploaded_at",
      )
      .single();

    if (updateError || !updatedFile) {
      return Response.json({ error: updateError?.message ?? "Unable to assign document." }, { status: 500 });
    }

    const nextApplicationStatus = await syncGroupedApplicationStatus({ application, supabase });

    return Response.json({
      applicationStatus: nextApplicationStatus,
      file: {
        createdAt: updatedFile.created_at,
        id: updatedFile.id,
        originalName: updatedFile.original_name,
        reviewStatus: updatedFile.review_status,
        serviceRequiredDocumentId: updatedFile.service_required_document_id,
        size: updatedFile.size_bytes,
        type: updatedFile.mime_type,
        uploadedAt: updatedFile.uploaded_at,
      },
      ok: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to assign document.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const auth = await requirePlatformSchool();

  if ("error" in auth) {
    return jsonAuthError(auth.error);
  }

  const { fileId } = await params;
  const supabase = createSupabaseAdminClient();

  try {
    const { data: file, error: fileError } = await supabase
      .from("service_application_files")
      .select(
        "id, application_id, object_key, upload_status, review_status, service_required_document_id",
      )
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return Response.json({ error: "File was not found." }, { status: 404 });
    }

    if (file.upload_status !== "uploaded") {
      return Response.json({ error: "Only uploaded files can be deleted." }, { status: 400 });
    }

    if (normalizeReviewStatus(file.review_status) !== "pending") {
      return Response.json(
        { error: "Only documents still waiting for admin review can be deleted." },
        { status: 400 },
      );
    }

    const { data: application, error: applicationError } = await supabase
      .from("service_applications")
      .select("id, school_user_id, service_id, status")
      .eq("id", file.application_id)
      .eq("school_user_id", auth.userId)
      .single();

    if (applicationError || !application) {
      return Response.json({ error: "Application was not found." }, { status: 404 });
    }

    const applicationStatus = normalizeApplicationStatus(application.status);

    if (
      applicationStatus === "for_endorsement" ||
      applicationStatus === "for_final_approval" ||
      applicationStatus === "approved" ||
      applicationStatus === "rejected"
    ) {
      return Response.json(
        { error: "This application is already locked for review and can no longer be edited by the school." },
        { status: 400 },
      );
    }

    await deleteR2Object({ key: file.object_key });

    const { error: deleteError } = await supabase
      .from("service_application_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    const nextApplicationStatus = await syncGroupedApplicationStatus({ application, supabase });

    return Response.json({
      applicationStatus: nextApplicationStatus,
      fileId,
      ok: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete document.";
    return Response.json({ error: message }, { status: 500 });
  }
}
