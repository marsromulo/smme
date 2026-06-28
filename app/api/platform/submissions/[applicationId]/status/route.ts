import { getPlatformSession } from "@/lib/platform/auth";
import {
  buildSmmeEmailTemplate,
  getPlatformUrl,
  sendSendGridEmail,
} from "@/lib/sendgrid";
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

function buildApplicationApprovedEmail({
  adminNotes,
  platformUrl,
  schoolName,
  serviceName,
}: {
  adminNotes: string | null;
  platformUrl: string;
  schoolName: string;
  serviceName: string;
}) {
  const submissionsLink = platformUrl ? `${platformUrl}/platform/submissions` : null;
  const subject = `SMME service application approved: ${serviceName}`;
  const text = [
    `Dear ${schoolName},`,
    "",
    "Your application to the service has been approved.",
    "",
    `Service: ${serviceName}`,
    adminNotes ? `Admin note: ${adminNotes}` : null,
    submissionsLink ? `View application: ${submissionsLink}` : null,
    "",
    "This is an automated notification from the SDO Baguio SMME Platform.",
  ]
    .filter(Boolean)
    .join("\n");
  const html = buildSmmeEmailTemplate({
    action: submissionsLink
      ? {
          href: submissionsLink,
          label: "View Application",
        }
      : null,
    details: [
      { label: "Service", value: serviceName },
      { label: "Status", value: "Approved", tone: "approved" },
      ...(adminNotes ? [{ label: "Note", value: adminNotes }] : []),
    ],
    greeting: `Dear ${schoolName},`,
    intro: ["Your application to the service has been approved."],
    status: "approved",
    statusLabel: "Approved",
    title: "Application Approved",
  });

  return { html, subject, text };
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
    .select("school_id, school_user_id, service_id, status")
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

  let emailResult: { reason?: string; sent?: boolean } | null = null;

  if (status === "approved" && application.status !== "approved") {
    const [{ data: service }, { data: school }, authUser] = await Promise.all([
      supabase.from("services").select("name").eq("id", application.service_id).maybeSingle(),
      application.school_id
        ? supabase
            .from("schools")
            .select("school_name, representative_email")
            .eq("id", application.school_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.auth.admin.getUserById(application.school_user_id),
    ]);
    const schoolName =
      school?.school_name ?? authUser.data.user?.user_metadata?.school_name ?? authUser.data.user?.email ?? "School";
    const serviceName = service?.name ?? "SMME Service Application";
    const contactEmail = school?.representative_email ?? authUser.data.user?.email ?? null;
    const notificationBody = `${serviceName} application was approved.${adminNotes ? ` Note: ${adminNotes}` : ""}`;

    const { error: schoolNotificationError } = await supabase.from("school_notifications").insert({
      body: notificationBody,
      link_href: `/platform/submissions/${applicationId}`,
      recipient_user_id: application.school_user_id,
      reference_id: applicationId,
      reference_type: "service_application",
      title: "Service application approved",
      type: "service_application_approved",
    });

    if (schoolNotificationError) {
      console.error("Unable to create school application approval notification:", schoolNotificationError.message);
    }

    if (contactEmail) {
      const emailMessage = buildApplicationApprovedEmail({
        adminNotes: adminNotes || null,
        platformUrl: getPlatformUrl(),
        schoolName,
        serviceName,
      });

      try {
        emailResult = await sendSendGridEmail({
          html: emailMessage.html,
          subject: emailMessage.subject,
          text: emailMessage.text,
          to: {
            email: contactEmail,
            name: schoolName,
          },
        });
      } catch (emailError) {
        console.error(
          "Unable to send application approval email:",
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
}
