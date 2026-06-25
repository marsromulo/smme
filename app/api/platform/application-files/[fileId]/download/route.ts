import { NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform/auth";
import { createR2GetSignedUrl } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ApplicationFileRow = {
  application_id: string;
  id: string;
  mime_type: string;
  object_key: string;
  original_name: string;
};

type ApplicationRow = {
  school_user_id: string;
};

function cleanDownloadName(value: string) {
  const cleaned = value.replace(/["\r\n\\]+/g, "").trim();
  return cleaned || "document";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const session = await getPlatformSession();

  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const url = new URL(request.url);
  const isDownload = url.searchParams.get("disposition") === "attachment";

  try {
    const supabase = createSupabaseAdminClient();
    const { data: file, error: fileError } = await supabase
      .from("service_application_files")
      .select("id, application_id, object_key, original_name, mime_type")
      .eq("id", fileId)
      .eq("upload_status", "uploaded")
      .single();

    if (fileError || !file) {
      return Response.json({ error: "File was not found." }, { status: 404 });
    }

    const fileRow = file as ApplicationFileRow;
    const { data: application, error: applicationError } = await supabase
      .from("service_applications")
      .select("school_user_id")
      .eq("id", fileRow.application_id)
      .single();

    if (applicationError || !application) {
      return Response.json({ error: "Application was not found." }, { status: 404 });
    }

    const applicationRow = application as ApplicationRow;
    const isOwner = session.role === "school" && applicationRow.school_user_id === session.userId;
    const isAdmin = session.role === "admin";

    if (!isOwner && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const downloadName = cleanDownloadName(fileRow.original_name);
    const disposition = `${isDownload ? "attachment" : "inline"}; filename="${downloadName}"`;
    const signedUrl = await createR2GetSignedUrl({
      disposition,
      key: fileRow.object_key,
    });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open file.";
    return Response.json({ error: message }, { status: 500 });
  }
}
