import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseRegistrationDecision,
  requirePlatformAdmin,
} from "../helpers";
import { slugifySchoolName } from "@/app/platform/school-records";

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

    const decisionLabel = parsed.data.status === "approved" ? "approved" : "rejected";
    const { error: notificationError } = await supabase.from("admin_notifications").insert({
      type: `school_registration_${decisionLabel}`,
      title: `School registration ${decisionLabel}`,
      body: `${registration.school_name} was ${decisionLabel}.`,
      school_registration_request_id: registration.id,
    });

    if (notificationError) {
      return Response.json(
        {
          registration,
          warning: `Registration updated, but notification logging failed: ${notificationError.message}`,
        },
      );
    }

    return Response.json({ registration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update registration.";
    return Response.json({ error: message }, { status: 500 });
  }
}
