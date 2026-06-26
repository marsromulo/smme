import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  detailRow,
  getPlatformUrl,
  paragraph,
  sendSendGridEmail,
} from "@/lib/sendgrid";
import { createPendingSchoolAuthUser } from "./auth-users";
import {
  parseSchoolRegistrationPayload,
  requirePlatformAdmin,
} from "./helpers";

function registrationDatabaseErrorMessage(message: string) {
  if (message.includes("schema cache") && message.includes("school_registration_requests")) {
    return "School registration database columns are not available yet. Run supabase/001_school_registration.sql in Supabase, then retry.";
  }

  return message;
}

function getAdminNotificationEmail() {
  return (
    process.env.SMME_ADMIN_NOTIFICATION_EMAIL ??
    process.env.SENDGRID_ADMIN_EMAIL ??
    process.env.SENDGRID_FROM_EMAIL ??
    "admin@depedbaguio-sgod-smme.com"
  );
}

function buildAdminRegistrationEmail({
  contactNumber,
  platformUrl,
  registrationId,
  representativeEmail,
  representativeName,
  schoolName,
}: {
  contactNumber: string | null;
  platformUrl: string;
  registrationId: string;
  representativeEmail: string;
  representativeName: string;
  schoolName: string;
}) {
  const registrationLink = platformUrl ? `${platformUrl}/platform/registrations/${registrationId}` : null;
  const subject = `SMME new school registration: ${schoolName}`;
  const text = [
    "Dear SMME Admin,",
    "",
    "A new school registration request was submitted.",
    "",
    `School: ${schoolName}`,
    `Representative: ${representativeName}`,
    `Email: ${representativeEmail}`,
    contactNumber ? `Contact number: ${contactNumber}` : null,
    registrationLink ? `Open registration: ${registrationLink}` : null,
    "",
    "This is an automated notification from the SDO Baguio SMME Platform.",
  ]
    .filter(Boolean)
    .join("\n");
  const actionButton = registrationLink
    ? `<p style="margin:22px 0 0;"><a href="${registrationLink}" style="display:inline-block;padding:11px 16px;border-radius:6px;background:#0052d9;color:#ffffff;text-decoration:none;font-weight:700;">Open Registration</a></p>`
    : "";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#ffffff;">
      <h1 style="margin:0 0 16px;color:#071538;font-size:22px;">New School Registration Request</h1>
      ${paragraph("Dear SMME Admin,")}
      ${paragraph("A new school registration request was submitted.")}
      <table style="width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #dce5f2;background:#f8fbff;">
        <tbody>
          ${detailRow("School", schoolName)}
          ${detailRow("Representative", representativeName)}
          ${detailRow("Email", representativeEmail)}
          ${contactNumber ? detailRow("Contact number", contactNumber) : ""}
        </tbody>
      </table>
      ${actionButton}
      <p style="margin:24px 0 0;color:#607089;font-size:12px;line-height:1.5;">
        This is an automated notification from the SDO Baguio SMME Platform.
      </p>
    </div>
  `;

  return { html, subject, text };
}

export async function GET() {
  const auth = await requirePlatformAdmin();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.error === "Forbidden" ? 403 : 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("school_registration_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ registrations: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load registrations.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseSchoolRegistrationPayload(body);

  if (parsed.error || !parsed.data) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const authResult = await createPendingSchoolAuthUser(
      supabase,
      {
        contactNumber: parsed.data.contactNumber ?? null,
        representativeEmail: parsed.data.representativeEmail,
        representativeName: parsed.data.representativeName,
        schoolId: parsed.data.schoolId ?? null,
        schoolName: parsed.data.schoolName,
      },
      parsed.data.password,
    );

    if (authResult.error || !authResult.data.user) {
      return Response.json(
        { error: authResult.error?.message ?? "Unable to create school login account." },
        { status: 500 },
      );
    }

    const { data: registration, error: insertError } = await supabase
      .from("school_registration_requests")
      .insert({
        school_name: parsed.data.schoolName,
        school_id: parsed.data.schoolId ?? null,
        school_type: parsed.data.schoolType ?? null,
        school_district: parsed.data.schoolDistrict ?? null,
        school_address: parsed.data.schoolAddress ?? null,
        school_offerings: parsed.data.schoolOfferings,
        representative_name: parsed.data.representativeName,
        representative_position: parsed.data.representativePosition ?? null,
        representative_email: parsed.data.representativeEmail,
        contact_number: parsed.data.contactNumber ?? null,
        status: "new",
      })
      .select()
      .single();

    if (insertError) {
      await supabase.auth.admin.deleteUser(authResult.data.user.id).catch(() => null);
      return Response.json({ error: registrationDatabaseErrorMessage(insertError.message) }, { status: 500 });
    }

    const { error: notificationError } = await supabase.from("admin_notifications").insert({
      type: "school_registration_submitted",
      title: "New school registration request",
      body: `${parsed.data.schoolName} submitted a school account request.`,
      reference_type: "school_registration",
      reference_id: registration.id,
      link_href: `/platform/registrations/${registration.id}`,
      school_registration_request_id: registration.id,
    });

    const warnings: string[] = [];

    if (notificationError) {
      warnings.push(`admin notification failed: ${notificationError.message}`);
    }

    try {
      const emailMessage = buildAdminRegistrationEmail({
        contactNumber: parsed.data.contactNumber ?? null,
        platformUrl: getPlatformUrl(),
        registrationId: registration.id,
        representativeEmail: parsed.data.representativeEmail,
        representativeName: parsed.data.representativeName,
        schoolName: parsed.data.schoolName,
      });

      const emailResult = await sendSendGridEmail({
        html: emailMessage.html,
        subject: emailMessage.subject,
        text: emailMessage.text,
        to: {
          email: getAdminNotificationEmail(),
          name: "SMME Admin",
        },
      });

      if (!emailResult.sent) {
        warnings.push(`admin email failed: ${emailResult.reason ?? "Unable to send email."}`);
      }
    } catch (emailError) {
      warnings.push(
        `admin email failed: ${emailError instanceof Error ? emailError.message : "Unable to send email."}`,
      );
    }

    if (warnings.length > 0) {
      return Response.json(
        {
          registration,
          warning: `Registration saved, but ${warnings.join("; ")}.`,
        },
        { status: 201 },
      );
    }

    return Response.json({ registration }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit registration.";
    return Response.json({ error: message }, { status: 500 });
  }
}
