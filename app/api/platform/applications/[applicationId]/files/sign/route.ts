import { randomUUID } from "crypto";
import { createR2PutSignedUrl } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cleanString, jsonAuthError, requirePlatformSchool } from "../../../helpers";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILE_COUNT = 40;

type IncomingFile = {
  name: string;
  size: number;
  type: string;
};

function isAllowedFileType(type: string) {
  return type === "application/pdf" || type.startsWith("image/");
}

function cleanFileName(value: string) {
  const fallback = "document";
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return cleaned || fallback;
}

function parseFiles(body: unknown): {
  files?: IncomingFile[];
  serviceRequiredDocumentId?: string | null;
  error?: string;
} {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const files = Array.isArray(record.files) ? record.files : [];
  const serviceRequiredDocumentId = cleanString(record.serviceRequiredDocumentId);

  if (files.length === 0) {
    return { error: "Select at least one file to upload." };
  }

  if (files.length > MAX_FILE_COUNT) {
    return { error: `Upload up to ${MAX_FILE_COUNT} files at a time.` };
  }

  const parsedFiles = files.map((item) => {
    const file = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      name: cleanString(file.name),
      size: typeof file.size === "number" ? file.size : Number(file.size),
      type: cleanString(file.type).toLowerCase(),
    };
  });

  for (const file of parsedFiles) {
    if (!file.name) {
      return { error: "Every file must have a name." };
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      return { error: `${file.name} has an invalid file size.` };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { error: `${file.name} exceeds the 25 MB file limit.` };
    }

    if (!isAllowedFileType(file.type)) {
      return { error: `${file.name} must be a PDF or image file.` };
    }
  }

  return { files: parsedFiles, serviceRequiredDocumentId: serviceRequiredDocumentId || null };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const auth = await requirePlatformSchool();

  if ("error" in auth) {
    return jsonAuthError(auth.error);
  }

  const { applicationId } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseFiles(body);

  if (parsed.error || !parsed.files) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: application, error: applicationError } = await supabase
      .from("service_applications")
      .select("id, service_id, school_user_id")
      .eq("id", applicationId)
      .eq("school_user_id", auth.userId)
      .single();

    if (applicationError || !application) {
      return Response.json({ error: "Application was not found." }, { status: 404 });
    }

    if (parsed.serviceRequiredDocumentId) {
      const { data: requiredDocument, error: requiredDocumentError } = await supabase
        .from("service_required_documents")
        .select("id")
        .eq("id", parsed.serviceRequiredDocumentId)
        .eq("service_id", application.service_id)
        .single();

      if (requiredDocumentError || !requiredDocument) {
        return Response.json(
          { error: "Selected requirement does not belong to this service." },
          { status: 400 },
        );
      }
    }

    const fileRows = parsed.files.map((file) => ({
      application_id: applicationId,
      mime_type: file.type,
      object_key: `applications/${auth.userId}/${applicationId}/${randomUUID()}-${cleanFileName(file.name)}`,
      original_name: file.name,
      service_required_document_id: parsed.serviceRequiredDocumentId,
      size_bytes: file.size,
      upload_status: "pending",
      uploaded_by: auth.userId,
    }));

    const { data: insertedFiles, error: filesError } = await supabase
      .from("service_application_files")
      .insert(fileRows)
      .select("id, object_key, original_name, mime_type");

    if (filesError || !insertedFiles) {
      return Response.json(
        { error: filesError?.message ?? "Unable to prepare upload records." },
        { status: 500 },
      );
    }

    const uploads = await Promise.all(
      insertedFiles.map(async (file) => ({
        fileId: file.id,
        name: file.original_name,
        uploadUrl: await createR2PutSignedUrl({
          contentType: file.mime_type,
          key: file.object_key,
        }),
      })),
    );

    return Response.json({ uploads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare uploads.";
    return Response.json({ error: message }, { status: 500 });
  }
}
