import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cleanString, jsonAuthError, requirePlatformSchool } from "./helpers";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const serviceId = cleanString((body as Record<string, unknown> | null)?.serviceId);

  if (!serviceId) {
    return Response.json({ error: "Service is required." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("status", "active")
      .single();

    if (serviceError || !service) {
      return Response.json({ error: "Service is not available for applications." }, { status: 404 });
    }

    const { data: school } = await supabase
      .from("schools")
      .select("id")
      .eq("representative_email", auth.email ?? "")
      .eq("status", "active")
      .maybeSingle();

    const { data: application, error: applicationError } = await supabase
      .from("service_applications")
      .insert({
        school_id: school?.id ?? null,
        school_user_id: auth.userId,
        service_id: serviceId,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      return Response.json(
        { error: applicationError?.message ?? "Unable to create application." },
        { status: 500 },
      );
    }

    return Response.json({ applicationId: application.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create application.";
    return Response.json({ error: message }, { status: 500 });
  }
}
