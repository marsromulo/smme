import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
      school_registration_request_id: registration.id,
    });

    if (notificationError) {
      return Response.json(
        {
          registration,
          warning: `Registration saved, but admin notification failed: ${notificationError.message}`,
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
