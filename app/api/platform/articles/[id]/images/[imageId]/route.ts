import { deleteR2Object } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/app/api/platform/school-registrations/helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const auth = await requirePlatformAdmin();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.error === "Forbidden" ? 403 : 401 });
  }

  const { id, imageId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: image } = await supabase
    .from("article_images")
    .select("object_key")
    .eq("id", imageId)
    .eq("article_id", id)
    .maybeSingle();

  if (!image) {
    return Response.json({ error: "Image was not found." }, { status: 404 });
  }

  const { error } = await supabase.from("article_images").delete().eq("id", imageId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await deleteR2Object({ key: image.object_key }).catch(() => null);
  return Response.json({ ok: true });
}
