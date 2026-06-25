import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "../../school-registrations/helpers";

function parseReorderPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    return { error: "Request body is required." };
  }

  const record = body as Record<string, unknown>;
  const services = Array.isArray(record.services) ? record.services : [];

  const parsedServices = services.map((item) => {
    const service = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      id: typeof service.id === "string" ? service.id.trim() : "",
      sortOrder: Number(service.sortOrder),
    };
  });

  if (parsedServices.length === 0) {
    return { error: "At least one service is required." };
  }

  if (parsedServices.some((service) => !service.id || !Number.isInteger(service.sortOrder))) {
    return { error: "Each service requires an id and sort order." };
  }

  return { data: parsedServices };
}

export async function POST(request: Request) {
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

  const parsed = parseReorderPayload(body);

  if (parsed.error || !parsed.data) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    for (const service of parsed.data) {
      const { error } = await supabase
        .from("services")
        .update({ sort_order: service.sortOrder })
        .eq("id", service.id);

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reorder services.";
    return Response.json({ error: message }, { status: 500 });
  }
}
