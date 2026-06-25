import { getPlatformSession } from "@/lib/platform/auth";
import {
  detailRow,
  getPlatformUrl,
  paragraph,
  sendSendGridEmail,
} from "@/lib/sendgrid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseReviewPayload(body: unknown): {
  data?: {
    reviewNote: string | null;
    reviewStatus: ReviewStatus;
    serviceRequiredDocumentId: string | null;
  };
  error?: string;
} {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const reviewStatus = cleanString(record.reviewStatus).toLowerCase();
  const serviceRequiredDocumentId = cleanString(record.serviceRequiredDocumentId);
  const reviewNote = cleanString(record.reviewNote);

  if (
    reviewStatus !== "pending" &&
    reviewStatus !== "approved" &&
    reviewStatus !== "rejected" &&
    reviewStatus !== "resubmit"
  ) {
    return { error: "Status must be Approved, Rejected, or Resubmit." };
  }

  return {
    data: {
      reviewNote: reviewNote || null,
      reviewStatus,
      serviceRequiredDocumentId: serviceRequiredDocumentId || null,
    },
  };
}

function reviewStatusLabel(status: ReviewStatus) {
  if (status === "resubmit") {
    return "Resubmit";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function reviewStatusSubject(status: ReviewStatus) {
  if (status === "resubmit") {
    return "Document marked for resubmission";
  }

  return `Document ${reviewStatusLabel(status).toLowerCase()}`;
}

function buildDocumentReviewEmail({
  fileName,
  note,
  platformUrl,
  requirementName,
  schoolName,
  serviceName,
  status,
}: {
  fileName: string;
  note: string | null;
  platformUrl: string;
  requirementName: string | null;
  schoolName: string;
  serviceName: string;
  status: ReviewStatus;
}) {
  const statusLabel = reviewStatusLabel(status);
  const subject = `SMME ${reviewStatusSubject(status)}: ${requirementName ?? fileName}`;
  const actionText =
    status === "resubmit"
      ? "Please sign in to the SMME Platform, review the note, and upload the corrected document."
      : "You may sign in to the SMME Platform to view the document review details.";
  const text = [
    `Dear ${schoolName},`,
    "",
    "The SMME admin has reviewed one of your submitted documents.",
    "",
    `Service: ${serviceName}`,
    `Document requirement: ${requirementName ?? "Unassigned"}`,
    `File: ${fileName}`,
    `Status: ${statusLabel}`,
    note ? `Note: ${note}` : null,
    "",
    actionText,
    platformUrl ? `Platform: ${platformUrl}/platform/submissions` : null,
    "",
    "This is an automated notification from the SDO Baguio SMME Platform.",
  ]
    .filter(Boolean)
    .join("\n");

  const actionButton = platformUrl
    ? `<p style="margin:22px 0 0;"><a href="${platformUrl}/platform/submissions" style="display:inline-block;padding:11px 16px;border-radius:6px;background:#0052d9;color:#ffffff;text-decoration:none;font-weight:700;">Open SMME Platform</a></p>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#ffffff;">
      <h1 style="margin:0 0 16px;color:#071538;font-size:22px;">Document Review Update</h1>
      ${paragraph(`Dear ${schoolName},`)}
      ${paragraph("The SMME admin has reviewed one of your submitted documents.")}
      <table style="width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #dce5f2;background:#f8fbff;">
        <tbody>
          ${detailRow("Service", serviceName)}
          ${detailRow("Requirement", requirementName ?? "Unassigned")}
          ${detailRow("File", fileName)}
          ${detailRow("Status", statusLabel)}
          ${note ? detailRow("Note", note) : ""}
        </tbody>
      </table>
      ${paragraph(actionText)}
      ${actionButton}
      <p style="margin:24px 0 0;color:#607089;font-size:12px;line-height:1.5;">
        This is an automated notification from the SDO Baguio SMME Platform.
      </p>
    </div>
  `;

  return { html, subject, text };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
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

  const parsed = parseReviewPayload(body);

  if (parsed.error || !parsed.data) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { fileId } = await params;
  const supabase = createSupabaseAdminClient();

  try {
    const { data: file, error: fileError } = await supabase
      .from("service_application_files")
      .select("id, application_id, original_name, review_status")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return Response.json({ error: "File was not found." }, { status: 404 });
    }

    const { data: application, error: applicationError } = await supabase
      .from("service_applications")
      .select("id, school_id, school_user_id, service_id")
      .eq("id", file.application_id)
      .single();

    if (applicationError || !application) {
      return Response.json({ error: "Application was not found." }, { status: 404 });
    }

    let requirementName: string | null = null;
    const { data: service } = await supabase
      .from("services")
      .select("name")
      .eq("id", application.service_id)
      .maybeSingle();
    const { data: school } = application.school_id
      ? await supabase
          .from("schools")
          .select("school_name, representative_email")
          .eq("id", application.school_id)
          .maybeSingle()
      : { data: null };

    if (parsed.data.serviceRequiredDocumentId) {
      const { data: requirement, error: requirementError } = await supabase
        .from("service_required_documents")
        .select("id, name")
        .eq("id", parsed.data.serviceRequiredDocumentId)
        .eq("service_id", application.service_id)
        .single();

      if (requirementError || !requirement) {
        return Response.json(
          { error: "Selected requirement does not belong to this service." },
          { status: 400 },
        );
      }

      requirementName = requirement.name;
    }

    const { error: updateError } = await supabase
      .from("service_application_files")
      .update({
        review_note: parsed.data.reviewNote,
        review_status: parsed.data.reviewStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.userId,
        service_required_document_id: parsed.data.serviceRequiredDocumentId,
      })
      .eq("id", fileId);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    const statusChanged = file.review_status !== parsed.data.reviewStatus;
    let emailResult: { reason?: string; sent?: boolean } | null = null;

    if (parsed.data.reviewStatus !== "pending" && statusChanged) {
      const label = reviewStatusLabel(parsed.data.reviewStatus);
      const requirementText = requirementName ? ` for ${requirementName}` : "";
      const noteText = parsed.data.reviewNote ? ` Note: ${parsed.data.reviewNote}` : "";

      const { error: notificationError } = await supabase.from("school_notifications").insert({
        body: `${file.original_name}${requirementText} was marked ${label}.${noteText}`,
        recipient_user_id: application.school_user_id,
        title: `Document ${label}`,
        type: `service_document_${parsed.data.reviewStatus}`,
      });

      if (notificationError) {
        console.error("Unable to create school document notification:", notificationError.message);
      }

      const authUser = await supabase.auth.admin.getUserById(application.school_user_id);
      const contactEmail = school?.representative_email ?? authUser.data.user?.email ?? null;

      if (contactEmail) {
        const emailMessage = buildDocumentReviewEmail({
          fileName: file.original_name,
          note: parsed.data.reviewNote,
          platformUrl: getPlatformUrl(),
          requirementName,
          schoolName: school?.school_name ?? "School Contact",
          serviceName: service?.name ?? "SMME Service Application",
          status: parsed.data.reviewStatus,
        });

        try {
          emailResult = await sendSendGridEmail({
            html: emailMessage.html,
            subject: emailMessage.subject,
            text: emailMessage.text,
            to: {
              email: contactEmail,
              name: school?.school_name ?? undefined,
            },
          });
        } catch (emailError) {
          console.error(
            "Unable to send document review email:",
            emailError instanceof Error ? emailError.message : emailError,
          );
          emailResult = {
            reason: emailError instanceof Error ? emailError.message : "Unable to send email.",
            sent: false,
          };
        }
      } else {
        emailResult = { reason: "School contact email was not found.", sent: false };
      }
    }

    return Response.json({ email: emailResult, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update document review.";
    return Response.json({ error: message }, { status: 500 });
  }
}
