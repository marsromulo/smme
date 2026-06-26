import {
  detailRow,
  getPlatformUrl,
  paragraph,
  sendSendGridEmail,
} from "@/lib/sendgrid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cleanString, jsonAuthError, requirePlatformSchool } from "../../../helpers";

export const runtime = "nodejs";

type ApplicationStatus = "new" | "in_progress" | "approved" | "rejected";
type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit" | "invalid";

function parseFileIds(body: unknown): { fileIds?: string[]; replacesFileId?: string | null; error?: string } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const fileIds = Array.isArray(record.fileIds)
    ? Array.from(new Set(record.fileIds.map((fileId) => cleanString(fileId)).filter(Boolean)))
    : [];
  const replacesFileId = cleanString(record.replacesFileId);

  if (fileIds.length === 0) {
    return { error: "No uploaded files were provided." };
  }

  return { fileIds, replacesFileId: replacesFileId || null };
}

function normalizeApplicationStatus(value: string): ApplicationStatus {
  if (value === "approved") {
    return "approved";
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
}) {
  const { data: applications, error: applicationsError } = await supabase
    .from("service_applications")
    .select("id, status")
    .eq("school_user_id", application.school_user_id)
    .eq("service_id", application.service_id);

  if (applicationsError || !applications) {
    console.error("Unable to load grouped applications for status sync:", applicationsError?.message);
    return;
  }

  if (applications.some((item) => normalizeApplicationStatus(item.status) === "rejected")) {
    return;
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
    nextStatus = "approved";
  } else if (activeUploadedFiles.some((uploadedFile) => Boolean(uploadedFile.service_required_document_id))) {
    nextStatus = "in_progress";
  }

  const { error: updateStatusError } = await supabase
    .from("service_applications")
    .update({ status: nextStatus })
    .in("id", applicationIds);

  if (updateStatusError) {
    console.error("Unable to sync grouped application status:", updateStatusError.message);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAdminNotificationEmail() {
  return (
    process.env.SMME_ADMIN_NOTIFICATION_EMAIL ??
    process.env.SENDGRID_ADMIN_EMAIL ??
    process.env.SENDGRID_FROM_EMAIL ??
    "admin@depedbaguio-sgod-smme.com"
  );
}

function buildAdminResubmissionEmail({
  fileNames,
  platformUrl,
  requirementNames,
  schoolName,
  serviceName,
}: {
  fileNames: string[];
  platformUrl: string;
  requirementNames: string[];
  schoolName: string;
  serviceName: string;
}) {
  const subject = `SMME document resubmission: ${schoolName} - ${serviceName}`;
  const fileText = fileNames.join(", ");
  const requirementText = requirementNames.length > 0 ? requirementNames.join(", ") : "Assigned document";
  const platformLink = platformUrl ? `${platformUrl}/platform/submissions` : null;
  const text = [
    "Dear SMME Admin,",
    "",
    "A school uploaded corrected document(s) for a requirement marked Resubmit.",
    "",
    `School: ${schoolName}`,
    `Service: ${serviceName}`,
    `Requirement(s): ${requirementText}`,
    `Uploaded file(s): ${fileText}`,
    platformLink ? `Open submissions: ${platformLink}` : null,
    "",
    "This is an automated notification from the SDO Baguio SMME Platform.",
  ]
    .filter(Boolean)
    .join("\n");

  const actionButton = platformLink
    ? `<p style="margin:22px 0 0;"><a href="${platformLink}" style="display:inline-block;padding:11px 16px;border-radius:6px;background:#0052d9;color:#ffffff;text-decoration:none;font-weight:700;">Open Submissions</a></p>`
    : "";
  const fileList = fileNames.map((fileName) => `<li>${escapeHtml(fileName)}</li>`).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#ffffff;">
      <h1 style="margin:0 0 16px;color:#071538;font-size:22px;">Document Resubmission Received</h1>
      ${paragraph("Dear SMME Admin,")}
      ${paragraph("A school uploaded corrected document(s) for a requirement marked Resubmit.")}
      <table style="width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #dce5f2;background:#f8fbff;">
        <tbody>
          ${detailRow("School", schoolName)}
          ${detailRow("Service", serviceName)}
          ${detailRow("Requirement(s)", requirementText)}
        </tbody>
      </table>
      <p style="margin:0 0 8px;color:#607089;font-weight:700;">Uploaded file(s)</p>
      <ul style="margin:0;padding-left:20px;color:#17243a;font-weight:700;line-height:1.55;">
        ${fileList}
      </ul>
      ${actionButton}
      <p style="margin:24px 0 0;color:#607089;font-size:12px;line-height:1.5;">
        This is an automated notification from the SDO Baguio SMME Platform.
      </p>
    </div>
  `;

  return { html, subject, text };
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
      .select("id, school_id, school_user_id, service_id")
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

    const { data: completedFiles } = await supabase
      .from("service_application_files")
      .select("id, original_name, service_required_document_id")
      .eq("application_id", applicationId)
      .in("id", parsed.fileIds);
    const assignedFiles = (completedFiles ?? []).filter((file) => file.service_required_document_id);
    let emailResult: { reason?: string; sent?: boolean } | null = null;

    if (assignedFiles.length > 0) {
      const requiredDocumentIds = Array.from(
        new Set(
          assignedFiles
            .map((file) => file.service_required_document_id)
            .filter((id): id is string => Boolean(id)),
          ),
      );
      if (parsed.replacesFileId) {
        const { data: replacedFile, error: replacedFileError } = await supabase
          .from("service_application_files")
          .select("id, review_status, service_required_document_id")
          .eq("id", parsed.replacesFileId)
          .eq("application_id", applicationId)
          .maybeSingle();

        if (replacedFileError) {
          console.error("Unable to load replaced file for invalidation:", replacedFileError.message);
        } else if (
          replacedFile &&
          !parsed.fileIds.includes(replacedFile.id) &&
          replacedFile.service_required_document_id &&
          requiredDocumentIds.includes(replacedFile.service_required_document_id) &&
          normalizeReviewStatus(replacedFile.review_status) !== "invalid"
        ) {
          const invalidatedAt = new Date().toISOString();
          const { error: invalidateError } = await supabase
            .from("service_application_files")
            .update({
              review_note: "Invalidated after a replacement document was uploaded.",
              review_status: "invalid",
              reviewed_at: invalidatedAt,
              reviewed_by: null,
            })
            .eq("id", replacedFile.id);

          if (invalidateError) {
            console.error("Unable to invalidate replaced files:", invalidateError.message);
          } else {
            const { error: invalidHistoryError } = await supabase
              .from("service_application_file_review_history")
              .insert({
                created_at: invalidatedAt,
                review_note: "Invalidated after a replacement document was uploaded.",
                review_status: "invalid",
                reviewer_name: "System",
                reviewer_user_id: null,
                service_application_file_id: replacedFile.id,
              });

            if (invalidHistoryError) {
              console.error("Unable to record invalidation history:", invalidHistoryError.message);
            }
          }
        }
      }

      const [{ data: service }, { data: school }, { data: requiredDocuments }] = await Promise.all([
        supabase.from("services").select("name").eq("id", application.service_id).maybeSingle(),
        application.school_id
          ? supabase
              .from("schools")
              .select("school_name, representative_email")
              .eq("id", application.school_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("service_required_documents")
          .select("id, name")
          .in("id", requiredDocumentIds.length > 0 ? requiredDocumentIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      const authUser = await supabase.auth.admin.getUserById(application.school_user_id);
      const schoolName =
        school?.school_name ?? authUser.data.user?.user_metadata?.school_name ?? authUser.data.user?.email ?? "School";
      const serviceName = service?.name ?? "SMME Service Application";
      const fileNames = assignedFiles.map((file) => file.original_name);
      const requirementNames = (requiredDocuments ?? []).map((document) => document.name);

      const { error: notificationError } = await supabase.from("admin_notifications").insert({
        body: `${schoolName} uploaded ${assignedFiles.length} corrected document${
          assignedFiles.length === 1 ? "" : "s"
        } for ${serviceName}.`,
        link_href: `/platform/submissions/${applicationId}`,
        reference_id: applicationId,
        reference_type: "service_application",
        title: `Document submission from ${schoolName}`,
        type: "service_document_resubmitted",
      });

      if (notificationError) {
        console.error("Unable to create admin resubmission notification:", notificationError.message);
      }

      try {
        const emailMessage = buildAdminResubmissionEmail({
          fileNames,
          platformUrl: getPlatformUrl(),
          requirementNames,
          schoolName,
          serviceName,
        });

        emailResult = await sendSendGridEmail({
          html: emailMessage.html,
          subject: emailMessage.subject,
          text: emailMessage.text,
          to: {
            email: getAdminNotificationEmail(),
            name: "SMME Admin",
          },
        });
      } catch (emailError) {
        console.error(
          "Unable to send admin resubmission email:",
          emailError instanceof Error ? emailError.message : emailError,
        );
        emailResult = {
          reason: emailError instanceof Error ? emailError.message : "Unable to send email.",
          sent: false,
        };
      }
    }

    await syncGroupedApplicationStatus({ application, supabase });

    return Response.json({ email: emailResult, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to finalize uploads.";
    return Response.json({ error: message }, { status: 500 });
  }
}
