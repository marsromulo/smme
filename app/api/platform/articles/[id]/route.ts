import { deleteR2Object } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/app/api/platform/school-registrations/helpers";

function parseUpdate(body: unknown) {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const content = typeof record.content === "string" ? record.content.trim() : "";
  const date = typeof record.date === "string" ? record.date.trim() : "";

  if (!title) {
    return { error: "Title is required." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Enter a valid article date." };
  }

  return { data: { content, date, title } };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = parseUpdate(body);

  if (!parsed.data) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("articles")
    .update({
      article_date: parsed.data.date,
      content: parsed.data.content || null,
      title: parsed.data.title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.error === "Forbidden" ? 403 : 401 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: images } = await supabase
    .from("article_images")
    .select("object_key")
    .eq("article_id", id);
  const { error } = await supabase.from("articles").delete().eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await Promise.allSettled((images ?? []).map((image) => deleteR2Object({ key: image.object_key })));
  return Response.json({ ok: true });
}
