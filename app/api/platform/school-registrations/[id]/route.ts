import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildSmmeEmailTemplate,
  getPlatformUrl,
  sendSendGridEmail,
} from "@/lib/sendgrid";
import { approveSchoolAuthUser, rejectSchoolAuthUser, setPendingSchoolAuthUser } from "../auth-users";
import {
  parseRegistrationDecision,
  requirePlatformAdmin,
} from "../helpers";
import { slugifySchoolName } from "@/app/platform/school-records";

function buildSchoolRegistrationApprovedEmail({
  adminNotes,
  platformUrl,
  representativeName,
  schoolName,
}: {
  adminNotes: string | null;
  platformUrl: string;
  representativeName: string;
  schoolName: string;
}) {
  const loginLink = platformUrl ? `${platformUrl}/platform/login` : null;
  const subject = "SMME school registration approved";
  const text = [
    `Dear ${schoolName},`,
    "",
    "Your school registration has been approved.",
    "You can now sign in to the SMME Platform using the account details submitted during registration.",
    adminNotes ? `Admin note: ${adminNotes}` : null,
    loginLink ? `Sign in: ${loginLink}` : null,
    "",
    "This is an automated notification from the SDO Baguio SMME Platform.",
  ]
    .filter(Boolean)
    .join("\n");
  const html = buildSmmeEmailTemplate({
    action: loginLink
      ? {
          href: loginLink,
          label: "Sign in to Platform",
        }
      : null,
    details: [
      { label: "School", value: schoolName },
      { label: "Representative", value: representativeName },
      { label: "Status", value: "Approved" },
      ...(adminNotes ? [{ label: "Note", value: adminNotes }] : []),
    ],
    greeting: `Dear ${schoolName},`,
    hideTitleIcon: true,
    intro: [
      "Your school registration has been approved.",
      "You can now sign in to the SMME Platform using the account details submitted during registration.",
    ],
    status: "registration",
    statusLabel: "Registration",
    title: "Registration Approved",
  });

  return { html, subject, text, toName: representativeName };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdmin();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.error === "Forbidden" ? 403 : 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseRegistrationDecision(body);

  if (parsed.error || !parsed.data) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await params;

  try {
    const supabase = createSupabaseAdminClient();
    let schoolUserId: string | null = null;
    const { data: registrationForDecision, error: registrationError } = await supabase
      .from("school_registration_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (registrationError) {
      return Response.json({ error: registrationError.message }, { status: 500 });
    }

    const authProfile = {
      contactNumber: registrationForDecision.contact_number ?? null,
      registrationId: registrationForDecision.id,
      representativeEmail: registrationForDecision.representative_email,
      representativeName: registrationForDecision.representative_name,
      schoolId: registrationForDecision.school_id ?? null,
      schoolName: registrationForDecision.school_name,
    };

    if (parsed.data.status === "approved") {
      const authResult = await approveSchoolAuthUser(supabase, authProfile);

      if (authResult.error || !authResult.user) {
        return Response.json(
          { error: authResult.error?.message ?? "Unable to enable school login account." },
          { status: 500 },
        );
      }

      schoolUserId = authResult.user.id;
    } else if (parsed.data.status === "pending") {
      const authResult = await setPendingSchoolAuthUser(supabase, authProfile);

      if (authResult.error) {
        return Response.json(
          { error: authResult.error.message ?? "Unable to keep school login account pending." },
          { status: 500 },
        );
      }

      schoolUserId = "data" in authResult ? (authResult.data.user?.id ?? null) : null;
    } else {
      const authResult = await rejectSchoolAuthUser(supabase, authProfile);

      if (authResult.error) {
        return Response.json({ error: authResult.error.message }, { status: 500 });
      }

      schoolUserId = "data" in authResult ? (authResult.data.user?.id ?? null) : null;
    }

    const { data: registration, error: updateError } = await supabase
      .from("school_registration_requests")
      .update({
        status: parsed.data.status,
        admin_notes: parsed.data.adminNotes ?? null,
        reviewed_by: auth.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    if (parsed.data.status === "approved") {
      const schoolRecord = {
        school_registration_request_id: registration.id,
        slug: slugifySchoolName(registration.school_name, registration.id),
        school_name: registration.school_name,
        school_id: registration.school_id ?? null,
        school_type: registration.school_type ?? null,
        school_district: registration.school_district ?? null,
        school_address: registration.school_address ?? null,
        school_offerings: Array.isArray(registration.school_offerings)
          ? registration.school_offerings
          : [],
        representative_name: registration.representative_name,
        representative_position: registration.representative_position ?? null,
        representative_email: registration.representative_email,
        contact_number: registration.contact_number ?? null,
        status: "active",
      };
      const { data: existingSchool, error: existingSchoolError } = await supabase
        .from("schools")
        .select("id")
        .eq("school_registration_request_id", registration.id)
        .maybeSingle();

      if (existingSchoolError) {
        return Response.json({ error: existingSchoolError.message }, { status: 500 });
      }

      const schoolResult = existingSchool
        ? await supabase.from("schools").update(schoolRecord).eq("id", existingSchool.id)
        : await supabase.from("schools").insert(schoolRecord);

      if (schoolResult.error) {
        return Response.json({ error: schoolResult.error.message }, { status: 500 });
      }
    }

    const decisionLabel = parsed.data.status;
    const decisionDisplay = decisionLabel.charAt(0).toUpperCase() + decisionLabel.slice(1);
    const notificationErrors: string[] = [];
    const { error: notificationError } = await supabase.from("admin_notifications").insert({
      type: `school_registration_${decisionLabel}`,
      title: `School registration ${decisionDisplay}`,
      body:
        decisionLabel === "pending"
          ? `${registration.school_name} was marked Pending.`
          : `${registration.school_name} was ${decisionDisplay}.`,
      reference_type: "school_registration",
      reference_id: registration.id,
      link_href: `/platform/registrations/${registration.id}`,
      school_registration_request_id: registration.id,
    });

    if (notificationError) {
      notificationErrors.push(`admin notification failed: ${notificationError.message}`);
    }

    if (schoolUserId) {
      const noteText = parsed.data.adminNotes ? ` Notes: ${parsed.data.adminNotes}` : "";
      const schoolNotificationTitle =
        parsed.data.status === "approved"
          ? "School registration Approved"
          : parsed.data.status === "pending"
            ? "School registration Pending"
          : "School registration Rejected";
      const schoolNotificationBody =
        parsed.data.status === "approved"
          ? `Your school registration has been approved. You can now sign in to the platform.${noteText}`
          : parsed.data.status === "pending"
            ? `Your school registration is pending review.${noteText}`
            : `Your school registration was rejected. Please contact the division office for the next steps.${noteText}`;
      const { error: schoolNotificationError } = await supabase.from("school_notifications").insert({
        recipient_user_id: schoolUserId,
        type: `school_registration_${decisionLabel}`,
        title: schoolNotificationTitle,
        body: schoolNotificationBody,
        reference_type: "school_registration",
        reference_id: registration.id,
        link_href: "/platform",
        school_registration_request_id: registration.id,
      });

      if (schoolNotificationError) {
        notificationErrors.push(`school notification failed: ${schoolNotificationError.message}`);
      }
    }

    if (parsed.data.status === "approved") {
      try {
        const emailMessage = buildSchoolRegistrationApprovedEmail({
          adminNotes: parsed.data.adminNotes ?? null,
          platformUrl: getPlatformUrl(),
          representativeName: registration.representative_name,
          schoolName: registration.school_name,
        });
        const emailResult = await sendSendGridEmail({
          html: emailMessage.html,
          subject: emailMessage.subject,
          text: emailMessage.text,
          to: {
            email: registration.representative_email,
            name: emailMessage.toName,
          },
        });

        if (!emailResult.sent) {
          notificationErrors.push(
            `school approval email failed: ${emailResult.reason ?? "Unable to send email."}`,
          );
        }
      } catch (emailError) {
        notificationErrors.push(
          `school approval email failed: ${
            emailError instanceof Error ? emailError.message : "Unable to send email."
          }`,
        );
      }
    }

    if (notificationErrors.length > 0) {
      return Response.json(
        {
          registration,
          warning: `Registration updated, but ${notificationErrors.join("; ")}.`,
        },
      );
    }

    return Response.json({ registration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update registration.";
    return Response.json({ error: message }, { status: 500 });
  }
}
