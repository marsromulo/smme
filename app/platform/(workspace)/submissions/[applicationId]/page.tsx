import Link from "next/link";
import { ArrowLeft, Download, Eye, FileText } from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";
import {
  formatFileSize,
  formatSubmissionDate,
  formatSubmissionStatus,
  getSubmissionDetail,
  submissionStatusClass,
} from "@/app/platform/submissions-data";
import { SubmissionFileHistoryPopover } from "@/app/platform/components/SubmissionFileHistoryPopover";
import { SubmissionFileReviewPanel } from "@/app/platform/components/SubmissionFileReviewPanel";

type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit";

function normalizeReviewStatus(value: string): ReviewStatus {
  if (value === "approved" || value === "rejected" || value === "resubmit") {
    return value;
  }

  return "pending";
}

function formatReviewStatus(value: string) {
  const status = normalizeReviewStatus(value);

  if (status === "pending") {
    return "Needs review";
  }

  if (status === "resubmit") {
    return "Resubmit";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function PlatformSubmissionDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const session = await getPlatformSession();
  const { applicationId } = await params;
  const submission = await getSubmissionDetail({ applicationId, session });
  const uploadedFiles = submission.files.filter((file) => file.upload_status === "uploaded");
  const requiredDocumentMap = new Map(submission.requiredDocuments.map((document) => [document.id, document.name]));
  const isAdmin = session.role === "admin";

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <Link className="platform-back-link" href="/platform/submissions">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to Submissions
          </Link>
          <span className="platform-kicker">{submission.serviceCode}</span>
          <h1>{submission.serviceName}</h1>
          <p>
            Last submitted by {submission.schoolName} on {formatSubmissionDate(submission.submittedAt)}.
          </p>
        </div>
        <span className={submissionStatusClass(submission.status)}>
          {formatSubmissionStatus(submission.status)}
        </span>
      </section>

      <section className="platform-submission-detail-grid">
        <article className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Uploaded package</span>
              <h2>Submitted Documents ({uploadedFiles.length})</h2>
            </div>
          </div>

          {uploadedFiles.length === 0 ? (
            <p className="platform-empty-state">No uploaded files are available for this submission.</p>
          ) : isAdmin ? (
            <SubmissionFileReviewPanel
              files={uploadedFiles.map((file) => ({
                createdAt: file.created_at,
                id: file.id,
                mimeType: file.mime_type,
                originalName: file.original_name,
                reviewHistory: file.review_history.map((history) => ({
                  createdAt: history.created_at,
                  id: history.id,
                  reviewStatus: normalizeReviewStatus(history.review_status),
                  reviewerName: history.reviewer_name,
                })),
                reviewNote: file.review_note,
                reviewStatus: normalizeReviewStatus(file.review_status),
                serviceRequiredDocumentId: file.service_required_document_id,
                sizeBytes: file.size_bytes,
                uploadedAt: file.uploaded_at,
              }))}
              requiredDocuments={submission.requiredDocuments}
            />
          ) : (
            <div className="platform-submission-file-list">
              {uploadedFiles.map((file) => (
                <article className="platform-submission-file" key={file.id}>
                  <span>
                    <FileText aria-hidden="true" size={19} />
                  </span>
                  <div>
                    <strong>{file.original_name}</strong>
                    <small>
                      {file.mime_type} · {formatFileSize(file.size_bytes)} · Submitted{" "}
                      {formatSubmissionDate(file.uploaded_at ?? file.created_at)}
                    </small>
                    {file.service_required_document_id || file.review_status !== "pending" || file.review_note ? (
                      <small className="platform-file-review-readonly">
                        {file.service_required_document_id
                          ? `${requiredDocumentMap.get(file.service_required_document_id) ?? "Assigned requirement"} · `
                          : ""}
                        {formatReviewStatus(file.review_status)}
                        {file.review_note ? ` · ${file.review_note}` : ""}
                      </small>
                    ) : null}
                  </div>
                  <div className="platform-submission-file-actions">
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
                      className="platform-btn primary"
                      href={`/api/platform/application-files/${file.id}/download?disposition=attachment`}
                    >
                      <Download aria-hidden="true" size={15} />
                      Download
                    </a>
                    <SubmissionFileHistoryPopover
                      fileName={file.original_name}
                      history={file.review_history.map((history) => ({
                        createdAt: history.created_at,
                        id: history.id,
                        reviewStatus: normalizeReviewStatus(history.review_status),
                        reviewerName: history.reviewer_name,
                      }))}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <aside className="platform-section platform-submission-summary">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Summary</span>
              <h2>Submission Details</h2>
            </div>
          </div>
          <dl>
            <dt>School</dt>
            <dd>{submission.schoolName}</dd>
            <dt>Status</dt>
            <dd>{formatSubmissionStatus(submission.status)}</dd>
            <dt>Last submitted</dt>
            <dd>{formatSubmissionDate(submission.submittedAt)}</dd>
            <dt>Uploaded files</dt>
            <dd>{submission.fileCount}</dd>
          </dl>
          {submission.adminNotes ? (
            <div className="platform-submission-notes">
              <strong>Admin notes</strong>
              <p>{submission.adminNotes}</p>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
