"use client";

import { useState } from "react";
import { ChevronDown, Download, Eye, FileText, Save } from "lucide-react";
import {
  SubmissionFileHistoryPopover,
  type SubmissionFileHistoryEntry,
} from "@/app/platform/components/SubmissionFileHistoryPopover";

type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit" | "invalid";
type RequirementStatus = "not_assigned" | "assigned" | "needs_review" | "resubmit" | "rejected" | "approved";

type ReviewFile = {
  createdAt: string;
  id: string;
  mimeType: string;
  originalName: string;
  reviewHistory: ReviewHistory[];
  reviewNote: string | null;
  reviewStatus: ReviewStatus;
  reviewedAt: string | null;
  serviceRequiredDocumentId: string | null;
  sizeBytes: number;
  uploadedAt: string | null;
};

type RequiredDocument = {
  id: string;
  name: string;
};

type ReviewHistory = SubmissionFileHistoryEntry;

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

function requirementStatusLabel(status: RequirementStatus) {
  if (status === "not_assigned") {
    return "Not Assigned";
  }

  if (status === "needs_review") {
    return "Needs review";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
}

export function SubmissionFileReviewPanel({
  files,
  requiredDocuments,
}: {
  files: ReviewFile[];
  requiredDocuments: RequiredDocument[];
}) {
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [expandedRequirementId, setExpandedRequirementId] = useState<string | null>(null);
  const [reviewHistory, setReviewHistory] = useState<Record<string, ReviewHistory[]>>(() =>
    Object.fromEntries(files.map((file) => [file.id, file.reviewHistory])),
  );
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
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        history?: {
          created_at: string;
          id: string;
          review_note: string | null;
          review_status: ReviewStatus;
          reviewer_name: string;
        } | null;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update document review.");
      }

      if (result.history) {
        const nextHistory = result.history;
        setReviewHistory((currentHistory) => ({
          ...currentHistory,
          [fileId]: [
            {
              createdAt: nextHistory.created_at,
              id: nextHistory.id,
              reviewNote: nextHistory.review_note,
              reviewStatus: nextHistory.review_status,
              reviewerName: nextHistory.reviewer_name,
            },
            ...(currentHistory[fileId] ?? []),
          ],
        }));
      }

      updateFileState(fileId, { message: "Saved.", isSaving: false });
    } catch (error) {
      updateFileState(fileId, {
        isSaving: false,
        message: error instanceof Error ? error.message : "Unable to update document review.",
      });
    }
  }

  function getRequirementStatus(requiredDocumentId: string): RequirementStatus {
    const assignedFiles = files.filter(
      (file) => fileState[file.id]?.serviceRequiredDocumentId === requiredDocumentId,
    );
    const activeFiles = assignedFiles.filter((file) => fileState[file.id]?.reviewStatus !== "invalid");

    if (activeFiles.length === 0) {
      return "not_assigned";
    }

    if (activeFiles.every((file) => fileState[file.id]?.reviewStatus === "approved")) {
      return "approved";
    }

    if (activeFiles.some((file) => fileState[file.id]?.reviewStatus === "rejected")) {
      return "rejected";
    }

    if (activeFiles.some((file) => fileState[file.id]?.reviewStatus === "resubmit")) {
      return "resubmit";
    }

    if (
      activeFiles.some((file) => {
        const history = reviewHistory[file.id] ?? [];
        return fileState[file.id]?.reviewStatus === "pending" && (file.reviewedAt || history.length > 0);
      })
    ) {
      return "needs_review";
    }

    return "assigned";
  }

  function renderFileReviewCard(file: ReviewFile) {
    const current = fileState[file.id];
    const history = reviewHistory[file.id] ?? [];
    const isExpanded = expandedFileId === file.id;
    const requirementName = requiredDocuments.find(
      (document) => document.id === current.serviceRequiredDocumentId,
    )?.name;

    return (
      <article className={`platform-uploaded-review-card${isExpanded ? " active" : ""}`} key={file.id}>
        <div className="platform-uploaded-review-header">
          <button
            className="platform-uploaded-review-toggle"
            onClick={() => setExpandedFileId(isExpanded ? null : file.id)}
            type="button"
          >
            <span>
              <FileText aria-hidden="true" size={17} />
            </span>
            <span>
              <strong>
                <em>Filename:</em> <span className="platform-file-name-underlined">{file.originalName}</span>
              </strong>
              <small>
                {requirementName ?? "Unassigned"} · {reviewStatusLabel(current.reviewStatus)}
              </small>
            </span>
            <ChevronDown aria-hidden="true" className={isExpanded ? "open" : undefined} size={17} />
          </button>
          <div className="platform-uploaded-review-quick-actions">
            <a
              aria-label={`Preview ${file.originalName}`}
              className="platform-file-quick-action preview"
              href={`/api/platform/application-files/${file.id}/download?disposition=inline`}
              target="_blank"
              rel="noreferrer"
              title="Preview"
            >
              <Eye aria-hidden="true" size={14} />
            </a>
            <a
              aria-label={`Download ${file.originalName}`}
              className="platform-file-quick-action download"
              href={`/api/platform/application-files/${file.id}/download?disposition=attachment`}
              title="Download"
            >
              <Download aria-hidden="true" size={14} />
            </a>
          </div>
        </div>

        {isExpanded ? (
          <div className="platform-uploaded-review-body">
            <small className="platform-uploaded-review-meta">
              {file.mimeType} · {formatFileSize(file.sizeBytes)} · Submitted{" "}
              {formatDate(file.uploadedAt ?? file.createdAt)}
            </small>

            <div className="platform-file-review-controls compact">
              <label>
                <span>Document</span>
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
                  <option value="invalid">Invalid</option>
                </select>
              </label>

              <label className="platform-file-review-note">
                <span>Note</span>
                <textarea
                  value={current.reviewNote}
                  onChange={(event) => updateFileState(file.id, { reviewNote: event.target.value })}
                  placeholder="Add review note"
                  rows={3}
                />
              </label>
            </div>

            <div className="platform-uploaded-review-footer">
              <SubmissionFileHistoryPopover fileName={file.originalName} history={history} />
              <div className="platform-uploaded-review-actions">
                <button
                  className="platform-btn primary"
                  disabled={current.isSaving}
                  onClick={() => void saveFileReview(file.id)}
                  type="button"
                >
                  <Save aria-hidden="true" size={14} />
                  {current.isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {current.message ? <p className="platform-file-review-message">{current.message}</p> : null}
          </div>
        ) : null}
      </article>
    );
  }

  const requirementStatuses = requiredDocuments.map((document) => getRequirementStatus(document.id));
  const approvedCount = requirementStatuses.filter((status) => status === "approved").length;
  const attentionCount = requirementStatuses.filter(
    (status) => status === "needs_review" || status === "resubmit" || status === "rejected",
  ).length;
  const assignedCount = requirementStatuses.filter((status) => status === "assigned").length;
  const notAssignedCount = requirementStatuses.filter((status) => status === "not_assigned").length;

  return (
    <div className="platform-submission-review-layout">
      <section className="platform-requirement-review-list" aria-label="Service document requirements">
        <div className="platform-review-progress">
          <strong>
            {approvedCount} of {requiredDocuments.length} approved
          </strong>
          <span>{attentionCount} needs attention</span>
          <span>{assignedCount} assigned</span>
          <span>{notAssignedCount} not assigned</span>
        </div>
        {requiredDocuments.map((document, index) => {
          const status = getRequirementStatus(document.id);
          const assignedFiles = files.filter(
            (file) => fileState[file.id]?.serviceRequiredDocumentId === document.id,
          );
          const isExpanded = expandedRequirementId === document.id;

          return (
            <article className="platform-requirement-review-card" key={document.id}>
              <div className="platform-requirement-review-row admin">
                <span>{index + 1}</span>
                <button
                  className="platform-requirement-review-toggle"
                  onClick={() => setExpandedRequirementId(isExpanded ? null : document.id)}
                  type="button"
                >
                  <strong>{document.name}</strong>
                </button>
                <em className="platform-requirement-file-count">{assignedFiles.length}</em>
                <small className={`platform-doc-status ${statusClass(status)}`}>
                  {requirementStatusLabel(status)}
                </small>
                <button
                  aria-label={isExpanded ? `Collapse ${document.name}` : `Expand ${document.name}`}
                  className="platform-requirement-chevron"
                  onClick={() => setExpandedRequirementId(isExpanded ? null : document.id)}
                  type="button"
                >
                  <ChevronDown aria-hidden="true" className={isExpanded ? "open" : undefined} size={17} />
                </button>
              </div>
              {isExpanded ? (
                <div className="platform-requirement-assigned-files">
                  {assignedFiles.length === 0 ? (
                    <p>No documents assigned yet.</p>
                  ) : (
                    assignedFiles.map((file) => renderFileReviewCard(file))
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <aside className="platform-uploaded-review-list" aria-label="Unassigned documents">
        <div className="platform-uploaded-review-head">
          <span className="platform-kicker">Unassigned documents</span>
          <strong>
            {files.filter((file) => !fileState[file.id]?.serviceRequiredDocumentId).length}
          </strong>
        </div>

        {files.filter((file) => !fileState[file.id]?.serviceRequiredDocumentId).length === 0 ? (
          <p className="platform-empty-state compact">No unassigned documents.</p>
        ) : (
          files
            .filter((file) => !fileState[file.id]?.serviceRequiredDocumentId)
            .map((file) => renderFileReviewCard(file))
        )}
      </aside>
    </div>
  );
}
