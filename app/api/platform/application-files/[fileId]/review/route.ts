import { getPlatformSession } from "@/lib/platform/auth";
import {
  buildSmmeEmailTemplate,
  getPlatformUrl,
  sendSendGridEmail,
} from "@/lib/sendgrid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit" | "invalid";
type ApplicationStatus = "new" | "in_progress" | "approved" | "rejected";
type RequiredDocumentStatus = "not_assigned" | "pending" | "approved" | "rejected" | "resubmit";

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
    reviewStatus !== "resubmit" &&
    reviewStatus !== "invalid"
  ) {
    return { error: "Status must be Approved, Rejected, Resubmit, or Invalid." };
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

function reviewEmailTone(status: ReviewStatus) {
  if (status === "approved" || status === "rejected" || status === "resubmit") {
    return status;
  }

  return "info";
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
  const statusTone = reviewEmailTone(status);
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
    ? {
        href: `${platformUrl}/platform/submissions`,
        label: status === "resubmit" ? "Upload Corrected Document" : "View Review Details",
      }
    : null;
  const html = buildSmmeEmailTemplate({
    action: actionButton,
    details: [
      { label: "Service", value: serviceName },
      { label: "Requirement", value: requirementName ?? "Unassigned" },
      { label: "File", value: fileName },
      { label: "Status", value: statusLabel, tone: statusTone },
      ...(note ? [{ label: "Note", value: note }] : []),
    ],
    greeting: `Dear ${schoolName},`,
    intro: ["The SMME admin has reviewed one of your submitted documents.", actionText],
    status: statusTone,
    statusLabel,
    title: "Document Review Update",
  });

  return { html, subject, text };
}

function buildRequiredDocumentReviewEmail({
  fileNames,
  note,
  platformUrl,
  requirementName,
  schoolName,
  serviceName,
  status,
}: {
  fileNames: string[];
  note: string | null;
  platformUrl: string;
  requirementName: string;
  schoolName: string;
  serviceName: string;
  status: "approved" | "rejected";
}) {
  const statusLabel = reviewStatusLabel(status);
  const subject = `SMME required document ${status}`;
  const actionText = "You may sign in to the SMME Platform to view the document review details.";
  const text = [
    `Dear ${schoolName},`,
    "",
    `The SMME admin has marked a required document as ${statusLabel}.`,
    "",
    `Service: ${serviceName}`,
    `Required document: ${requirementName}`,
    `Status: ${statusLabel}`,
    fileNames.length > 0 ? `Reviewed file(s): ${fileNames.join(", ")}` : null,
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
    ? {
        href: `${platformUrl}/platform/submissions`,
        label: "View Review Details",
      }
    : null;
  const html = buildSmmeEmailTemplate({
    action: actionButton,
    details: [
      { label: "Service", value: serviceName },
      { label: "Required document", value: requirementName },
      { label: "Status", value: statusLabel, tone: status },
      ...(note ? [{ label: "Note", value: note }] : []),
    ],
    fileNames,
    greeting: `Dear ${schoolName},`,
    intro: [`The SMME admin has marked a required document as ${statusLabel}.`, actionText],
    status,
    statusLabel,
    title: `Required Document ${statusLabel}`,
  });

  return { html, subject, text };
}

function readableNameFromEmail(email: string | null) {
  if (!email) {
    return "";
  }

  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  if (!localPart) {
    return "";
  }

  return localPart
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function userMetadataName(metadata: unknown) {
  const record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  return cleanString(record.name) || cleanString(record.full_name);
}

async function getReviewerName({
  session,
  supabase,
}: {
  session: {
    email: string | null;
    name: string | null;
    userId: string | null;
  };
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}) {
  if (session.userId) {
    const { data: profile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("display_name")
      .eq("user_id", session.userId)
      .maybeSingle();

    const profileName = cleanString(profile?.display_name);

    if (profileName) {
      return profileName.includes("@") ? readableNameFromEmail(profileName) || "Admin" : profileName;
    }

    if (
      profileError &&
      !profileError.message.includes("admin_profiles") &&
      !profileError.message.includes("schema cache") &&
      !profileError.message.includes("does not exist")
    ) {
      console.error("Unable to load admin profile:", profileError.message);
    }

    const authUser = await supabase.auth.admin.getUserById(session.userId);
    const metadataName = userMetadataName(authUser.data.user?.user_metadata);

    if (metadataName) {
      return metadataName;
    }
  }

  return cleanString(session.name) || readableNameFromEmail(session.email) || "Admin";
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

function evaluateRequiredDocumentStatus(
  files: Array<{ review_status: string; upload_status: string }>,
): RequiredDocumentStatus {
  const activeFiles = files.filter(
    (file) => file.upload_status === "uploaded" && normalizeReviewStatus(file.review_status) !== "invalid",
  );

  if (activeFiles.length === 0) {
    return "not_assigned";
  }

  if (activeFiles.every((file) => normalizeReviewStatus(file.review_status) === "approved")) {
    return "approved";
  }

  if (activeFiles.some((file) => normalizeReviewStatus(file.review_status) === "rejected")) {
    return "rejected";
  }

  if (activeFiles.some((file) => normalizeReviewStatus(file.review_status) === "resubmit")) {
    return "resubmit";
  }

  return "pending";
}

async function getRequiredDocumentReviewState({
  application,
  serviceRequiredDocumentId,
  supabase,
}: {
  application: {
    school_user_id: string;
    service_id: string;
  };
  serviceRequiredDocumentId: string;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}) {
  const { data: applications, error: applicationsError } = await supabase
    .from("service_applications")
    .select("id")
    .eq("school_user_id", application.school_user_id)
    .eq("service_id", application.service_id);

  if (applicationsError || !applications) {
    console.error("Unable to load grouped applications for required document status:", applicationsError?.message);
    return null;
  }

  const applicationIds = applications.map((item) => item.id);
  const { data: files, error: filesError } = await supabase
    .from("service_application_files")
    .select("original_name, review_status, upload_status")
    .eq("service_required_document_id", serviceRequiredDocumentId)
    .in("application_id", applicationIds.length > 0 ? applicationIds : ["00000000-0000-0000-0000-000000000000"]);

  if (filesError) {
    console.error("Unable to load required document files for status:", filesError.message);
    return null;
  }

  const activeFiles = (files ?? []).filter(
    (file) => file.upload_status === "uploaded" && normalizeReviewStatus(file.review_status) !== "invalid",
  );

  return {
    fileNames: activeFiles.map((file) => file.original_name),
    status: evaluateRequiredDocumentStatus(files ?? []),
  };
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
    supabase
      .from("service_required_documents")
      .select("id")
      .eq("service_id", application.service_id),
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
      .select("id, application_id, original_name, review_status, service_required_document_id")
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

    const previousRequiredDocumentState = parsed.data.serviceRequiredDocumentId
      ? await getRequiredDocumentReviewState({
          application,
          serviceRequiredDocumentId: parsed.data.serviceRequiredDocumentId,
          supabase,
        })
      : null;

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

    const reviewerName = await getReviewerName({ session, supabase });
    const { data: history, error: historyError } = await supabase
      .from("service_application_file_review_history")
      .insert({
        review_note: parsed.data.reviewNote,
        review_status: parsed.data.reviewStatus,
        reviewer_name: reviewerName,
        reviewer_user_id: session.userId,
        service_application_file_id: fileId,
      })
      .select("id, service_application_file_id, reviewer_name, review_status, review_note, created_at")
      .single();

    if (historyError) {
      console.error("Unable to create document review history:", historyError.message);
      return Response.json(
        {
          error:
            "Document review was saved, but the update history could not be recorded. Please run the latest service applications SQL migration and try again.",
        },
        { status: 500 },
      );
    }

    await syncGroupedApplicationStatus({ application, supabase });

    const statusChanged = file.review_status !== parsed.data.reviewStatus;
    let emailResult: { reason?: string; sent?: boolean } | null = null;

    if (parsed.data.reviewStatus !== "pending" && statusChanged) {
      const label = reviewStatusLabel(parsed.data.reviewStatus);
      const requirementText = requirementName ? ` for ${requirementName}` : "";
      const noteText = parsed.data.reviewNote ? ` Note: ${parsed.data.reviewNote}` : "";
      const nextRequiredDocumentState =
        parsed.data.serviceRequiredDocumentId && requirementName
          ? await getRequiredDocumentReviewState({
              application,
              serviceRequiredDocumentId: parsed.data.serviceRequiredDocumentId,
              supabase,
            })
          : null;

      const { error: notificationError } = await supabase.from("school_notifications").insert({
        body: `${file.original_name}${requirementText} was marked ${label}.${noteText}`,
        link_href: `/platform/submissions/${file.application_id}`,
        recipient_user_id: application.school_user_id,
        reference_id: fileId,
        reference_type: "service_application_file",
        title:
          parsed.data.reviewStatus === "approved"
            ? "Document submission approved by admin"
            : `Document submission ${label}`,
        type: `service_document_${parsed.data.reviewStatus}`,
      });

      if (notificationError) {
        console.error("Unable to create school document notification:", notificationError.message);
      }

      const authUser = await supabase.auth.admin.getUserById(application.school_user_id);
      const contactEmail = school?.representative_email ?? authUser.data.user?.email ?? null;

      if (contactEmail) {
        const rdStatus = nextRequiredDocumentState?.status;
        const requiredDocumentName = requirementName;
        const shouldSendRequiredDocumentEmail =
          Boolean(requiredDocumentName) &&
          (rdStatus === "approved" || rdStatus === "rejected") &&
          previousRequiredDocumentState?.status !== rdStatus;
        const emailMessage = shouldSendRequiredDocumentEmail
          ? buildRequiredDocumentReviewEmail({
              fileNames: nextRequiredDocumentState?.fileNames ?? [file.original_name],
              note: parsed.data.reviewNote,
              platformUrl: getPlatformUrl(),
              requirementName: requiredDocumentName!,
              schoolName: school?.school_name ?? "School Contact",
              serviceName: service?.name ?? "SMME Service Application",
              status: rdStatus,
            })
          : buildDocumentReviewEmail({
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

    return Response.json({ email: emailResult, history: history ?? null, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update document review.";
    return Response.json({ error: message }, { status: 500 });
  }
}
