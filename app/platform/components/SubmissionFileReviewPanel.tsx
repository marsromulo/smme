"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Check, ChevronDown, Download, Eye, FileText, Save } from "lucide-react";
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
  savedReviewNote: string;
  savedReviewStatus: ReviewStatus;
  savedServiceRequiredDocumentId: string;
  serviceRequiredDocumentId: string;
};

type TransferAnimation = {
  fromX: number;
  fromY: number;
  id: string;
  targetDocumentId: string;
  toX: number;
  toY: number;
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
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const requirementCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [expandedRequirementId, setExpandedRequirementId] = useState<string | null>(null);
  const [highlightRequirementId, setHighlightRequirementId] = useState<string | null>(null);
  const [transferAnimation, setTransferAnimation] = useState<TransferAnimation | null>(null);
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
          savedReviewNote: file.reviewNote ?? "",
          reviewStatus: file.reviewStatus ?? "pending",
          savedReviewStatus: file.reviewStatus ?? "pending",
          savedServiceRequiredDocumentId: file.serviceRequiredDocumentId ?? "",
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

  function runAssignmentAnimation(fileId: string, targetDocumentId: string) {
    const sourceElement = fileCardRefs.current[fileId];
    const targetElement = requirementCardRefs.current[targetDocumentId];

    if (!sourceElement || !targetElement) {
      setHighlightRequirementId(targetDocumentId);
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => setHighlightRequirementId(null), 900);
      return;
    }

    const sourceRect = sourceElement.getBoundingClientRect();

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    setHighlightRequirementId(targetDocumentId);
    window.setTimeout(() => {
      const nextTargetElement = requirementCardRefs.current[targetDocumentId];
      const targetRect = (nextTargetElement ?? targetElement).getBoundingClientRect();

      setTransferAnimation({
        fromX: sourceRect.left + sourceRect.width / 2,
        fromY: sourceRect.top + Math.min(32, sourceRect.height / 2),
        id: `${fileId}-${Date.now()}`,
        targetDocumentId,
        toX: targetRect.left + targetRect.width / 2,
        toY: targetRect.top + targetRect.height / 2,
      });

      animationTimeoutRef.current = setTimeout(() => {
        setTransferAnimation(null);
        setHighlightRequirementId(null);
      }, 1100);
    }, 260);
  }

  async function saveFileReview(fileId: string) {
    const current = fileState[fileId];
    const previousSavedDocumentId = current.savedServiceRequiredDocumentId;
    const nextSavedDocumentId = current.serviceRequiredDocumentId;

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

      if (previousSavedDocumentId !== nextSavedDocumentId && nextSavedDocumentId) {
        runAssignmentAnimation(fileId, nextSavedDocumentId);
        setExpandedRequirementId(nextSavedDocumentId);
      }

      updateFileState(fileId, {
        message: "Saved.",
        isSaving: false,
        savedReviewNote: current.reviewNote,
        savedReviewStatus: current.reviewStatus,
        savedServiceRequiredDocumentId: nextSavedDocumentId,
      });
    } catch (error) {
      updateFileState(fileId, {
        isSaving: false,
        message: error instanceof Error ? error.message : "Unable to update document review.",
      });
    }
  }

  function getRequirementStatus(requiredDocumentId: string): RequirementStatus {
    const assignedFiles = files.filter(
      (file) => fileState[file.id]?.savedServiceRequiredDocumentId === requiredDocumentId,
    );
    const activeFiles = assignedFiles.filter((file) => fileState[file.id]?.savedReviewStatus !== "invalid");

    if (activeFiles.length === 0) {
      return "not_assigned";
    }

    if (activeFiles.every((file) => fileState[file.id]?.savedReviewStatus === "approved")) {
      return "approved";
    }

    if (activeFiles.some((file) => fileState[file.id]?.savedReviewStatus === "rejected")) {
      return "rejected";
    }

    if (activeFiles.some((file) => fileState[file.id]?.savedReviewStatus === "resubmit")) {
      return "resubmit";
    }

    if (
      activeFiles.some((file) => {
        const history = reviewHistory[file.id] ?? [];
        return fileState[file.id]?.savedReviewStatus === "pending" && (file.reviewedAt || history.length > 0);
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
      (document) => document.id === current.savedServiceRequiredDocumentId,
    )?.name;
    const isAssignmentOnly = !current.savedServiceRequiredDocumentId;
    const hasUnsavedAssignment = current.serviceRequiredDocumentId !== current.savedServiceRequiredDocumentId;
    const hasUnsavedReview =
      hasUnsavedAssignment ||
      current.reviewStatus !== current.savedReviewStatus ||
      current.reviewNote !== current.savedReviewNote;

    return (
      <article
        aria-busy={current.isSaving}
        className={`platform-uploaded-review-card${isExpanded ? " active" : ""}${
          current.isSaving ? " saving" : ""
        }`}
        key={file.id}
        ref={(element) => {
          fileCardRefs.current[file.id] = element;
        }}
      >
        {current.isSaving ? (
          <div className="platform-review-card-saving-indicator" aria-hidden="true">
            <span />
          </div>
        ) : null}

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
                {hasUnsavedAssignment ? " · Assignment pending save" : ""}
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
                  <option value="">{isAssignmentOnly ? "Select document" : "Unassigned"}</option>
                  {requiredDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.name}
                    </option>
                  ))}
                </select>
              </label>

              {isAssignmentOnly ? null : (
                <>
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
                      rows={3}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="platform-uploaded-review-footer">
              {isAssignmentOnly ? (
                <span />
              ) : (
                <SubmissionFileHistoryPopover fileName={file.originalName} history={history} />
              )}
              <div className="platform-uploaded-review-actions">
                {!isAssignmentOnly && hasUnsavedReview ? (
                  <span className="platform-unsaved-review-pill">Unsaved changes</span>
                ) : null}
                <button
                  className="platform-btn primary"
                  disabled={current.isSaving || (isAssignmentOnly && !current.serviceRequiredDocumentId)}
                  onClick={() => void saveFileReview(file.id)}
                  type="button"
                >
                  {isAssignmentOnly ? <Check aria-hidden="true" size={14} /> : <Save aria-hidden="true" size={14} />}
                  {current.isSaving ? "Saving..." : isAssignmentOnly ? "OK" : "Save"}
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
      {transferAnimation ? (
        <span
          aria-hidden="true"
          className="platform-assignment-transfer-orb"
          key={transferAnimation.id}
          style={
            {
              "--transfer-from-x": `${transferAnimation.fromX}px`,
              "--transfer-from-y": `${transferAnimation.fromY}px`,
              "--transfer-to-x": `${transferAnimation.toX}px`,
              "--transfer-to-y": `${transferAnimation.toY}px`,
            } as CSSProperties
          }
        />
      ) : null}
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
            (file) => fileState[file.id]?.savedServiceRequiredDocumentId === document.id,
          );
          const isExpanded = expandedRequirementId === document.id;
          const isHighlighted = highlightRequirementId === document.id;

          return (
            <article
              className={`platform-requirement-review-card${isHighlighted ? " assignment-highlight" : ""}`}
              key={document.id}
              ref={(element) => {
                requirementCardRefs.current[document.id] = element;
              }}
            >
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
            {files.filter((file) => !fileState[file.id]?.savedServiceRequiredDocumentId).length}
          </strong>
        </div>

        {files.filter((file) => !fileState[file.id]?.savedServiceRequiredDocumentId).length === 0 ? (
          <p className="platform-empty-state compact">No unassigned documents.</p>
        ) : (
          files
            .filter((file) => !fileState[file.id]?.savedServiceRequiredDocumentId)
            .map((file) => renderFileReviewCard(file))
        )}
      </aside>
    </div>
  );
}
