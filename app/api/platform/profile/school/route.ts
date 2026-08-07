import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  return cleanString(value) || null;
}

export async function PATCH(request: Request) {
  const session = await getPlatformSession();

  if (session.role !== "school" || !session.userId || !session.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolName = cleanString(body?.schoolName);
  const schoolDistrict = cleanString(body?.schoolDistrict);
  const schoolAddress = cleanString(body?.schoolAddress);
  const representativeName = cleanString(body?.representativeName);
  const representativePosition = cleanString(body?.representativePosition);
  const contactNumber = cleanString(body?.contactNumber);
  const schoolOfferings = Array.isArray(body?.schoolOfferings)
    ? Array.from(
        new Set(
          body.schoolOfferings
            .map((offering) => cleanString(offering))
            .filter(Boolean),
        ),
      ).slice(0, 20)
    : [];

  if (!schoolName || !schoolDistrict || !schoolAddress) {
    return Response.json({ error: "School name, district, and address are required." }, { status: 400 });
  }

  if (!representativeName || !representativePosition || !contactNumber) {
    return Response.json(
      { error: "Representative name, position, and contact number are required." },
      { status: 400 },
    );
  }

  const update = {
    contact_number: contactNumber,
    representative_name: representativeName,
    representative_position: representativePosition,
    school_address: schoolAddress,
    school_district: schoolDistrict,
    school_id: optionalString(body?.schoolId),
    school_name: schoolName,
    school_offerings: schoolOfferings,
    school_type: optionalString(body?.schoolType),
    updated_at: new Date().toISOString(),
  };
  const supabase = createSupabaseAdminClient();
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .update(update)
    .eq("representative_email", session.email)
    .select("school_registration_request_id")
    .maybeSingle();

  if (schoolError) {
    return Response.json({ error: schoolError.message }, { status: 500 });
  }

  let registrationQuery = supabase
    .from("school_registration_requests")
    .update({
      contact_number: update.contact_number,
      representative_name: update.representative_name,
      representative_position: update.representative_position,
      school_address: update.school_address,
      school_district: update.school_district,
      school_id: update.school_id,
      school_name: update.school_name,
      school_offerings: update.school_offerings,
      school_type: update.school_type,
    });

  registrationQuery = school?.school_registration_request_id
    ? registrationQuery.eq("id", school.school_registration_request_id)
    : registrationQuery.eq("representative_email", session.email).eq("status", "approved");

  const { error: registrationError } = await registrationQuery;

  if (registrationError) {
    return Response.json({ error: registrationError.message }, { status: 500 });
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(session.userId, {
    user_metadata: {
      contact_number: contactNumber,
      representative_name: representativeName,
      school_name: schoolName,
    },
  });

  if (authError) {
    return Response.json({ error: authError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
