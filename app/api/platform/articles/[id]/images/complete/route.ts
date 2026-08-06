import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/app/api/platform/school-registrations/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdmin();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.error === "Forbidden" ? 403 : 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { imageIds?: unknown } | null;
  const imageIds = Array.isArray(body?.imageIds)
    ? body.imageIds.filter((value): value is string => typeof value === "string")
    : [];

  if (!imageIds.length) {
    return Response.json({ error: "No uploaded images were provided." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("article_images")
    .update({ upload_status: "uploaded", uploaded_at: new Date().toISOString() })
    .eq("article_id", id)
    .in("id", imageIds);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
