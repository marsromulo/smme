"use client";

import { useState } from "react";
import { Download, Eye, FileText, Save } from "lucide-react";

type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit";

type ReviewFile = {
  createdAt: string;
  id: string;
  mimeType: string;
  originalName: string;
  reviewNote: string | null;
  reviewStatus: ReviewStatus;
  serviceRequiredDocumentId: string | null;
  sizeBytes: number;
  uploadedAt: string | null;
};

type RequiredDocument = {
  id: string;
  name: string;
};

type FileFormState = {
  isSaving: boolean;
  message: string | null;
  reviewNote: string;
  reviewStatus: ReviewStatus;
  serviceRequiredDocumentId: string;
};

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function reviewStatusLabel(status: ReviewStatus) {
  if (status === "pending") {
    return "Needs review";
  }

  if (status === "resubmit") {
    return "Resubmit";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function SubmissionFileReviewPanel({
  files,
  requiredDocuments,
}: {
  files: ReviewFile[];
  requiredDocuments: RequiredDocument[];
}) {
  const [fileState, setFileState] = useState<Record<string, FileFormState>>(() =>
    Object.fromEntries(
      files.map((file) => [
        file.id,
        {
          isSaving: false,
          message: null,
          reviewNote: file.reviewNote ?? "",
          reviewStatus: file.reviewStatus ?? "pending",
          serviceRequiredDocumentId: file.serviceRequiredDocumentId ?? "",
        },
      ]),
    ),
  );

  function updateFileState(fileId: string, nextState: Partial<FileFormState>) {
    setFileState((current) => ({
      ...current,
      [fileId]: {
        ...current[fileId],
        ...nextState,
      },
    }));
  }

  async function saveFileReview(fileId: string) {
    const current = fileState[fileId];

    updateFileState(fileId, { isSaving: true, message: null });

    try {
      const response = await fetch(`/api/platform/application-files/${fileId}/review`, {
        body: JSON.stringify({
          reviewNote: current.reviewNote,
          reviewStatus: current.reviewStatus,
          serviceRequiredDocumentId: current.serviceRequiredDocumentId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update document review.");
      }

      updateFileState(fileId, { message: "Saved.", isSaving: false });
    } catch (error) {
      updateFileState(fileId, {
        isSaving: false,
        message: error instanceof Error ? error.message : "Unable to update document review.",
      });
    }
  }

  return (
    <div className="platform-submission-file-list">
      {files.map((file) => {
        const current = fileState[file.id];

        return (
          <article className="platform-submission-file review" key={file.id}>
            <span>
              <FileText aria-hidden="true" size={19} />
            </span>
            <div className="platform-submission-file-main">
              <strong>{file.originalName}</strong>
              <small>
                {file.mimeType} · {formatFileSize(file.sizeBytes)} · Submitted{" "}
                {formatDate(file.uploadedAt ?? file.createdAt)}
              </small>

              <div className="platform-file-review-controls">
                <label>
                  <span>Requirement</span>
                  <select
                    value={current.serviceRequiredDocumentId}
                    onChange={(event) =>
                      updateFileState(file.id, {
                        serviceRequiredDocumentId: event.target.value,
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {requiredDocuments.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={current.reviewStatus}
                    onChange={(event) =>
                      updateFileState(file.id, {
                        reviewStatus: event.target.value as ReviewStatus,
                      })
                    }
                  >
                    <option value="pending">Needs review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="resubmit">Resubmit</option>
                  </select>
                </label>

                <label className="platform-file-review-note">
                  <span>Note</span>
                  <textarea
                    value={current.reviewNote}
                    onChange={(event) => updateFileState(file.id, { reviewNote: event.target.value })}
                    placeholder="Add review note for this document"
                    rows={2}
                  />
                </label>
              </div>

              {current.message ? <p className="platform-file-review-message">{current.message}</p> : null}
            </div>
            <div className="platform-submission-file-actions review">
              <a
                className="platform-btn secondary"
                href={`/api/platform/application-files/${file.id}/download?disposition=inline`}
                target="_blank"
                rel="noreferrer"
              >
                <Eye aria-hidden="true" size={15} />
                Preview
              </a>
              <a
                className="platform-btn secondary"
                href={`/api/platform/application-files/${file.id}/download?disposition=attachment`}
              >
                <Download aria-hidden="true" size={15} />
                Download
              </a>
              <button
                className="platform-btn primary"
                disabled={current.isSaving}
                onClick={() => void saveFileReview(file.id)}
                type="button"
              >
                <Save aria-hidden="true" size={15} />
                {current.isSaving ? "Saving..." : `Save ${reviewStatusLabel(current.reviewStatus)}`}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
