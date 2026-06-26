"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, UploadCloud, XCircle } from "lucide-react";

type UploadResponse = {
  uploads?: {
    fileId: string;
    name: string;
    uploadUrl: string;
  }[];
  error?: string;
};

type CompleteUploadResponse = {
  email?: {
    reason?: string;
    sent?: boolean;
  } | null;
  error?: string;
  ok: boolean;
};

const maxFileSize = 25 * 1024 * 1024;

function isAllowedFile(file: File) {
  return file.type === "application/pdf" || file.type.startsWith("image/");
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Request failed.";
    throw new Error(message);
  }

  return data;
}

export function ServiceApplicationUploader({
  applicationId,
  buttonLabel = "Submit Document",
  compact = false,
  onUploadComplete,
  replacesFileId,
  refreshOnComplete = false,
  serviceId,
  serviceRequiredDocumentId,
  successMessage = "Application documents uploaded successfully.",
  uploadHint = "Select all documents for this service in one upload section.",
}: {
  applicationId?: string;
  buttonLabel?: string;
  compact?: boolean;
  onUploadComplete?: () => void;
  replacesFileId?: string;
  refreshOnComplete?: boolean;
  serviceId: string;
  serviceRequiredDocumentId?: string;
  successMessage?: string;
  uploadHint?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  function handleFiles(nextFiles: FileList | null) {
    setError(null);
    setMessage(null);
    setUploadedCount(0);

    const selectedFiles = Array.from(nextFiles ?? []);
    const invalidFile = selectedFiles.find((file) => !isAllowedFile(file));
    const oversizedFile = selectedFiles.find((file) => file.size > maxFileSize);

    if (invalidFile) {
      setFiles([]);
      setError(`${invalidFile.name} must be a PDF or image file.`);
      return;
    }

    if (oversizedFile) {
      setFiles([]);
      setError(`${oversizedFile.name} exceeds the 25 MB file limit.`);
      return;
    }

    setFiles(selectedFiles);
  }

  function removeFile(fileIndex: number) {
    if (isUploading) {
      return;
    }

    setError(null);
    setMessage(null);
    setUploadedCount(0);
    setFiles((currentFiles) => currentFiles.filter((_, index) => index !== fileIndex));

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (files.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage(null);
    setUploadedCount(0);

    try {
      let uploadApplicationId = applicationId;

      if (!uploadApplicationId) {
        const applicationResponse = await fetch("/api/platform/applications", {
          body: JSON.stringify({ serviceId }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const application = await readJson<{ applicationId: string; error?: string }>(applicationResponse);
        uploadApplicationId = application.applicationId;
      }

      const signResponse = await fetch(`/api/platform/applications/${uploadApplicationId}/files/sign`, {
        body: JSON.stringify({
          files: files.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
          serviceRequiredDocumentId: serviceRequiredDocumentId ?? null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const signedUploads = await readJson<UploadResponse>(signResponse);
      const uploads = signedUploads.uploads ?? [];
      const uploadedFileIds: string[] = [];

      for (const upload of uploads) {
        const file = files.find((selectedFile) => selectedFile.name === upload.name);

        if (!file) {
          throw new Error(`Unable to match signed upload for ${upload.name}.`);
        }

        const uploadResponse = await fetch(upload.uploadUrl, {
          body: file,
          headers: { "Content-Type": file.type },
          method: "PUT",
        });

        if (!uploadResponse.ok) {
          throw new Error(`Unable to upload ${file.name}.`);
        }

        uploadedFileIds.push(upload.fileId);
        setUploadedCount(uploadedFileIds.length);
      }

      const completeResponse = await fetch(
        `/api/platform/applications/${uploadApplicationId}/files/complete`,
        {
          body: JSON.stringify({ fileIds: uploadedFileIds, replacesFileId: replacesFileId ?? null }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const completeResult = await readJson<CompleteUploadResponse>(completeResponse);

      setFiles([]);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setMessage(
        completeResult.email?.sent === false
          ? `${successMessage} Admin email notification could not be sent. Check SendGrid configuration.`
          : successMessage,
      );
      onUploadComplete?.();
      if (refreshOnComplete) {
        router.refresh();
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload documents.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className={`platform-service-uploader${compact ? " compact" : ""}`}>
      <label className="platform-service-upload-zone">
        <input
          accept="application/pdf,image/*"
          disabled={isUploading}
          multiple
          name="applicationFiles"
          onChange={(event) => handleFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />
        <span>
          <UploadCloud aria-hidden="true" size={34} />
        </span>
        <strong>Upload PDF and image files</strong>
        <small>{uploadHint}</small>
      </label>

      {files.length > 0 ? (
        <div className="platform-selected-files">
          <div className="platform-selected-files-head">
            <strong>
              {files.length} file{files.length === 1 ? "" : "s"} selected
            </strong>
            <span>{formatFileSize(totalSize)}</span>
          </div>
          <ul>
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                <FileText aria-hidden="true" size={16} />
                <span>{file.name}</span>
                <small>{formatFileSize(file.size)}</small>
                <button
                  aria-label={`Remove ${file.name}`}
                  className="platform-selected-file-remove"
                  disabled={isUploading}
                  onClick={() => removeFile(index)}
                  title="Remove file"
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isUploading ? (
        <p className="platform-upload-status">
          Uploading {uploadedCount} of {files.length} files...
        </p>
      ) : null}

      {error ? (
        <p className="platform-form-message error">
          <XCircle aria-hidden="true" size={15} />
          {error}
        </p>
      ) : null}

      {message ? <p className="platform-form-message success">{message}</p> : null}

      <div className="platform-upload-actions">
        <button className="platform-btn primary" disabled={files.length === 0 || isUploading} onClick={handleSubmit} type="button">
          {isUploading ? "Uploading..." : buttonLabel}
        </button>
      </div>
    </div>
  );
}
