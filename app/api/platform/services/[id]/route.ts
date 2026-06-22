import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "../../school-registrations/helpers";
import { parseServicePayload, serviceDatabaseErrorMessage } from "../helpers";

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

  const parsed = parseServicePayload(body);

  if (parsed.error || !parsed.data) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await params;

  try {
    const supabase = createSupabaseAdminClient();
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .update({
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        target_users: parsed.data.targetUsers,
        sort_order: parsed.data.sortOrder,
      })
      .eq("id", id)
      .select()
      .single();

    if (serviceError) {
      return Response.json(
        { error: serviceDatabaseErrorMessage(serviceError) },
        { status: serviceError.code === "23505" ? 409 : 500 },
      );
    }

    const { error: deleteDocumentsError } = await supabase
      .from("service_required_documents")
      .delete()
      .eq("service_id", id);

    if (deleteDocumentsError) {
      return Response.json({ error: deleteDocumentsError.message }, { status: 500 });
    }

    if (parsed.data.documents.length > 0) {
      const { error: documentsError } = await supabase.from("service_required_documents").insert(
        parsed.data.documents.map((document) => ({
          service_id: id,
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

    return Response.json({ service });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update service.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdmin();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.error === "Forbidden" ? 403 : 401 });
  }

  const { id } = await params;

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("services").delete().eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete service.";
    return Response.json({ error: message }, { status: 500 });
  }
}
