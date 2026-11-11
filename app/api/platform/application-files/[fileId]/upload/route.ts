import { requirePlatformSchool, jsonAuthError } from "../../../applications/helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { putR2Object } from "@/lib/r2";

export const runtime = "nodejs";
const maxBytes = 4 * 1024 * 1024;

export async function PUT(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const auth = await requirePlatformSchool();
  if ("error" in auth) return jsonAuthError(auth.error);
  const { fileId } = await params;
  try {
    const db = createSupabaseAdminClient();
    const { data: file, error } = await db.from("service_application_files")
      .select("application_id, object_key, mime_type, size_bytes, upload_status")
      .eq("id", fileId).eq("uploaded_by", auth.userId).single();
    if (error || !file) return Response.json({ error: "Upload not found." }, { status: 404 });
    const { data: application } = await db.from("service_applications").select("id")
      .eq("id", file.application_id).eq("school_user_id", auth.userId).single();
    if (!application) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (file.upload_status !== "pending") return Response.json({ error: "This upload is already finalized. Please select the file again." }, { status: 409 });
    if (file.size_bytes > maxBytes || Number(request.headers.get("content-length")) > maxBytes) {
      return Response.json({ error: "The fallback upload supports files up to 4 MB. Please compress the file or retry from the main website address." }, { status: 413 });
    }
    if (request.headers.get("content-type") !== file.mime_type) return Response.json({ error: "The file type does not match the prepared upload." }, { status: 400 });
    // Bound streamed input before buffering it, even when Content-Length is absent.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "File content is required." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes || size > file.size_bytes) {
        await reader.cancel();
        return Response.json({ error: "The uploaded file exceeds its expected size." }, { status: 413 });
      }
      chunks.push(value);
    }
    if (size !== file.size_bytes) return Response.json({ error: "The file upload was incomplete. Please try again." }, { status: 400 });
    await putR2Object({ key: file.object_key, contentType: file.mime_type, body: Buffer.concat(chunks) });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to transfer the document to storage. Please try again shortly." }, { status: 502 });
  }
}
