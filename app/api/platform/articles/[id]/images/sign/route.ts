import { randomUUID } from "crypto";
import { createR2PutSignedUrl } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/app/api/platform/school-registrations/helpers";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILE_COUNT = 12;

type IncomingImage = { name: string; size: number; type: string };

function cleanFileName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "image"
  );
}

function parseImages(body: unknown) {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawImages = Array.isArray(record.images) ? record.images : [];

  if (!rawImages.length || rawImages.length > MAX_FILE_COUNT) {
    return { error: `Select between 1 and ${MAX_FILE_COUNT} files.` };
  }

  const images: IncomingImage[] = rawImages.map((item) => {
    const image = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      name: typeof image.name === "string" ? image.name.trim() : "",
      size: Number(image.size),
      type: typeof image.type === "string" ? image.type.toLowerCase() : "",
    };
  });

  for (const image of images) {
    if (!image.name || (!image.type.startsWith("image/") && image.type !== "application/pdf")) {
      return { error: "Only image and PDF files can be uploaded." };
    }

    if (!Number.isFinite(image.size) || image.size <= 0 || image.size > MAX_FILE_SIZE) {
      return { error: `${image.name} must be 10 MB or smaller.` };
    }
  }

  return { images };
}

export async function POST(
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

  const parsed = parseImages(body);

  if (!parsed.images) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: article } = await supabase.from("articles").select("id").eq("id", id).maybeSingle();

  if (!article) {
    return Response.json({ error: "Article was not found." }, { status: 404 });
  }

  const { count } = await supabase
    .from("article_images")
    .select("id", { count: "exact", head: true })
    .eq("article_id", id);
  const rows = parsed.images.map((image, index) => ({
    article_id: id,
    mime_type: image.type,
    object_key: `articles/${id}/${randomUUID()}-${cleanFileName(image.name)}`,
    original_name: image.name,
    size_bytes: image.size,
    sort_order: (count ?? 0) + index + 1,
  }));
  const { data: inserted, error } = await supabase
    .from("article_images")
    .insert(rows)
    .select("id, object_key, original_name, mime_type");

  if (error || !inserted) {
    return Response.json({ error: error?.message ?? "Unable to prepare image uploads." }, { status: 500 });
  }

  const uploads = await Promise.all(
    inserted.map(async (image) => ({
      imageId: image.id,
      name: image.original_name,
      uploadUrl: await createR2PutSignedUrl({ contentType: image.mime_type, key: image.object_key }),
    })),
  );

  return Response.json({ uploads });
}
