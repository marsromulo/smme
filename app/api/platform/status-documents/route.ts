import { getPlatformSession } from "@/lib/platform/auth";
import { statusDocumentPrefix } from "@/lib/school-status-uploads";
import { createR2GetSignedUrl } from "@/lib/r2";

export async function GET(request: Request) {
  const session = await getPlatformSession();
  if (!session.userId || !session.email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!/^school-status\/[a-f0-9]{64}\/[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(key)) return Response.json({ error: "Invalid document." }, { status: 400 });
  if (session.role !== "admin" && !key.startsWith(statusDocumentPrefix(session.email))) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const url = await createR2GetSignedUrl({ key, disposition: 'attachment' });
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Unable to download document." }, { status: 500 });
  }
}
