"use client";

import { useState } from "react";
import { ChevronDown, Download, Eye, FileText, FileUp } from "lucide-react";
import { ServiceApplicationUploader } from "@/app/platform/components/ServiceApplicationUploader";
import { type SubmissionFileHistoryEntry } from "@/app/platform/components/SubmissionFileHistoryPopover";

type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit" | "invalid";
type RequirementStatus = "not_assigned" | "assigned" | "needs_review" | "resubmit" | "rejected" | "approved";

type SchoolSubmissionFile = {
  createdAt: string;
  id: string;
  mimeType: string;
  originalName: string;
  reviewHistory: SubmissionFileHistoryEntry[];
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

function getRequirementStatus({
  files,
  requiredDocumentId,
}: {
  files: SchoolSubmissionFile[];
  requiredDocumentId: string;
}): RequirementStatus {
  const assignedFiles = files.filter((file) => file.serviceRequiredDocumentId === requiredDocumentId);
  const activeFiles = assignedFiles.filter((file) => file.reviewStatus !== "invalid");

  if (activeFiles.length === 0) {
    return "not_assigned";
  }

  if (activeFiles.every((file) => file.reviewStatus === "approved")) {
    return "approved";
  }

  if (activeFiles.some((file) => file.reviewStatus === "rejected")) {
    return "rejected";
  }

  if (activeFiles.some((file) => file.reviewStatus === "resubmit")) {
    return "resubmit";
  }

  if (
    activeFiles.some(
      (file) => file.reviewStatus === "pending" && (file.reviewedAt || file.reviewHistory.length > 0),
    )
  ) {
    return "needs_review";
  }

  return "assigned";
}

function SchoolSubmissionNotesPopover({
  fileName,
  history,
  reviewNote,
}: {
  fileName: string;
  history: SubmissionFileHistoryEntry[];
  reviewNote: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const notes = [
    ...(reviewNote
      ? [
          {
            createdAt: null,
            id: "current-note",
            note: reviewNote,
            reviewerName: "Current review",
            status: null,
          },
        ]
      : []),
    ...history
      .filter((item) => item.reviewNote?.trim())
      .map((item) => ({
        createdAt: item.createdAt,
        id: item.id,
        note: item.reviewNote ?? "",
        reviewerName: item.reviewerName,
        status: item.reviewStatus,
      })),
  ];
  const latestNote = notes[0]?.note;

  if (!latestNote) {
    return null;
  }

  return (
    <div className="platform-file-review-history-wrap notes">
      <div className="platform-file-review-history-trigger">
        <span>Notes:</span>
        <strong>{latestNote}</strong>
        {notes.length > 0 ? (
          <button onClick={() => setIsOpen(true)} type="button">
            Notes history
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <div className="platform-history-popover notes" role="dialog" aria-label={`${fileName} notes history`}>
          <div>
            <strong>Notes history</strong>
            <button onClick={() => setIsOpen(false)} type="button" aria-label="Close notes history">
              x
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Note</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((item) => (
                <tr key={item.id}>
                  <td>{item.reviewerName}</td>
                  <td>{item.note}</td>
                  <td>{item.createdAt ? formatDate(item.createdAt) : "Latest"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export function SchoolSubmissionDocumentPanel({
  applicationId,
  files,
  requiredDocuments,
  serviceId,
}: {
  applicationId: string;
  files: SchoolSubmissionFile[];
  requiredDocuments: RequiredDocument[];
  serviceId: string;
}) {
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [expandedRequirementId, setExpandedRequirementId] = useState<string | null>(null);
  const [resubmitUploadFileId, setResubmitUploadFileId] = useState<string | null>(null);

  function renderFileCard(file: SchoolSubmissionFile) {
    const isExpanded = expandedFileId === file.id;
    const requirementName = requiredDocuments.find(
      (document) => document.id === file.serviceRequiredDocumentId,
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
                {requirementName ?? "Unassigned"} · {reviewStatusLabel(file.reviewStatus)}
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
            <dl className="platform-school-file-readonly">
              <dt>Document</dt>
              <dd>{requirementName ?? "Unassigned"}</dd>
              <dt>Status</dt>
              <dd className="platform-school-file-status-value">
                <span className={`platform-doc-status ${statusClass(file.reviewStatus)}`}>
                  {reviewStatusLabel(file.reviewStatus)}
                </span>
                {file.reviewStatus === "resubmit" && file.serviceRequiredDocumentId ? (
                  <button
                    className="platform-file-resubmit-upload-button"
                    onClick={() =>
                      setResubmitUploadFileId(resubmitUploadFileId === file.id ? null : file.id)
                    }
                    type="button"
                  >
                    Upload
                  </button>
                ) : null}
              </dd>
            </dl>
            <SchoolSubmissionNotesPopover
              fileName={file.originalName}
              history={file.reviewHistory}
              reviewNote={file.reviewNote}
            />
            {resubmitUploadFileId === file.id && file.serviceRequiredDocumentId ? (
              <div className="platform-resubmit-upload">
                <strong>Upload corrected file for this document</strong>
                <ServiceApplicationUploader
                  applicationId={applicationId}
                  buttonLabel="Submit Resubmission"
                  compact
                  onUploadComplete={() => setResubmitUploadFileId(null)}
                  replacesFileId={file.id}
                  refreshOnComplete
                  serviceId={serviceId}
                  serviceRequiredDocumentId={file.serviceRequiredDocumentId}
                  successMessage="Resubmission uploaded successfully."
                  uploadHint="Upload the corrected PDF or image file for this document requirement."
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  }

  const requirementStatuses = requiredDocuments.map((document) =>
    getRequirementStatus({ files, requiredDocumentId: document.id }),
  );
  const approvedCount = requirementStatuses.filter((status) => status === "approved").length;
  const attentionCount = requirementStatuses.filter(
    (status) => status === "needs_review" || status === "resubmit" || status === "rejected",
  ).length;
  const assignedCount = requirementStatuses.filter((status) => status === "assigned").length;
  const notAssignedCount = requirementStatuses.filter((status) => status === "not_assigned").length;
  const unassignedFiles = files.filter((file) => !file.serviceRequiredDocumentId);

  return (
    <div className="platform-submission-review-layout school">
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
          const status = getRequirementStatus({ files, requiredDocumentId: document.id });
          const assignedFiles = files.filter((file) => file.serviceRequiredDocumentId === document.id);
          const isExpanded = expandedRequirementId === document.id;

          return (
            <article className="platform-requirement-review-card" key={document.id}>
              <div className="platform-requirement-review-row">
                <span>{index + 1}</span>
                <button
                  className="platform-requirement-review-toggle"
                  onClick={() => setExpandedRequirementId(isExpanded ? null : document.id)}
                  type="button"
                >
                  <strong>
                    {document.name}
                    <em>{assignedFiles.length}</em>
                  </strong>
                </button>
                <div className="platform-requirement-status-actions">
                  <small className={`platform-doc-status ${statusClass(status)}`}>
                    {requirementStatusLabel(status)}
                  </small>
                </div>
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
                    assignedFiles.map((file) => renderFileCard(file))
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
          <strong>{unassignedFiles.length}</strong>
        </div>

        {unassignedFiles.length === 0 ? (
          <p className="platform-empty-state compact">No unassigned documents.</p>
        ) : (
          unassignedFiles.map((file) => renderFileCard(file))
        )}

        <div className="platform-unassigned-upload-panel">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Upload package</span>
              <h2>Application Documents</h2>
            </div>
            <FileUp aria-hidden="true" size={22} />
          </div>
          <ServiceApplicationUploader
            applicationId={applicationId}
            refreshOnComplete
            serviceId={serviceId}
            successMessage="Application documents uploaded successfully. Your submitted document will be reviewed by the admin. Please visit your dashboard again to check for updates. You will also receive an email if the document you uploaded is approved."
          />
        </div>
      </aside>
    </div>
  );
}
