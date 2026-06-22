import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "../school-registrations/helpers";
import { mapServiceRows, parseServicePayload, serviceDatabaseErrorMessage } from "./helpers";

export async function GET() {
  const auth = await requirePlatformAdmin();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.error === "Forbidden" ? 403 : 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (servicesError) {
      return Response.json({ error: servicesError.message }, { status: 500 });
    }

    const serviceIds = (services ?? []).map((service) => service.id);
    const { data: documents, error: documentsError } = await supabase
      .from("service_required_documents")
      .select("*")
      .in("service_id", serviceIds.length > 0 ? serviceIds : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (documentsError) {
      return Response.json({ error: documentsError.message }, { status: 500 });
    }

    return Response.json({ services: mapServiceRows(services ?? [], documents ?? []) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load services.";
    return Response.json({ error: message }, { status: 500 });
  }
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

  const parsed = parseServicePayload(body);

  if (parsed.error || !parsed.data) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .insert({
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        target_users: parsed.data.targetUsers,
        sort_order: parsed.data.sortOrder,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (serviceError) {
      return Response.json(
        { error: serviceDatabaseErrorMessage(serviceError) },
        { status: serviceError.code === "23505" ? 409 : 500 },
      );
    }

    if (parsed.data.documents.length > 0) {
      const { error: documentsError } = await supabase.from("service_required_documents").insert(
        parsed.data.documents.map((document) => ({
          service_id: service.id,
          name: document.name,
          is_required: document.isRequired,
          sort_order: document.sortOrder,
        })),
      );

      if (documentsError) {
        return Response.json(
          { error: serviceDatabaseErrorMessage(documentsError) },
          { status: documentsError.code === "23505" ? 409 : 500 },
        );
      }
    }

    return Response.json({ service }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create service.";
    return Response.json({ error: message }, { status: 500 });
  }
}
