import { NextResponse } from "next/server";
import { createR2GetSignedUrl } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: image } = await supabase
    .from("article_images")
    .select("object_key, original_name")
    .eq("id", imageId)
    .eq("upload_status", "uploaded")
    .maybeSingle();

  if (!image) {
    return Response.json({ error: "Image was not found." }, { status: 404 });
  }

  const safeName = image.original_name.replace(/["\r\n\\]+/g, "").trim() || "article-image";
  const signedUrl = await createR2GetSignedUrl({
    disposition: `inline; filename="${safeName}"`,
    key: image.object_key,
  });

  return NextResponse.redirect(signedUrl);
}
