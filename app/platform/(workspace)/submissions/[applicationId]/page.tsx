import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";
import {
  formatSubmissionDate,
  formatSubmissionStatus,
  getSubmissionDetail,
  submissionStatusClass,
} from "@/app/platform/submissions-data";
import { SchoolSubmissionDocumentPanel } from "@/app/platform/components/SchoolSubmissionDocumentPanel";
import { SubmissionFileReviewPanel } from "@/app/platform/components/SubmissionFileReviewPanel";
import { SubmissionStatusDecisionForm } from "@/app/platform/components/SubmissionStatusDecisionForm";

type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit" | "invalid";

function normalizeReviewStatus(value: string): ReviewStatus {
  if (value === "approved" || value === "rejected" || value === "resubmit" || value === "invalid") {
    return value;
  }

  return "pending";
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
        {isAdmin ? (
          <SubmissionStatusDecisionForm applicationId={submission.id} status={submission.status} />
        ) : null}
      </section>

      <section className="platform-submission-detail-single">
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
                  reviewNote: history.review_note,
                  reviewStatus: normalizeReviewStatus(history.review_status),
                  reviewerName: history.reviewer_name,
                })),
                reviewNote: file.review_note,
                reviewStatus: normalizeReviewStatus(file.review_status),
                reviewedAt: file.reviewed_at,
                serviceRequiredDocumentId: file.service_required_document_id,
                sizeBytes: file.size_bytes,
                uploadedAt: file.uploaded_at,
              }))}
              requiredDocuments={submission.requiredDocuments}
            />
          ) : (
            <SchoolSubmissionDocumentPanel
              applicationId={submission.id}
              files={uploadedFiles.map((file) => ({
                createdAt: file.created_at,
                id: file.id,
                mimeType: file.mime_type,
                originalName: file.original_name,
                reviewHistory: file.review_history.map((history) => ({
                  createdAt: history.created_at,
                  id: history.id,
                  reviewNote: history.review_note,
                  reviewStatus: normalizeReviewStatus(history.review_status),
                  reviewerName: history.reviewer_name,
                })),
                reviewNote: file.review_note,
                reviewStatus: normalizeReviewStatus(file.review_status),
                reviewedAt: file.reviewed_at,
                serviceRequiredDocumentId: file.service_required_document_id,
                sizeBytes: file.size_bytes,
                uploadedAt: file.uploaded_at,
              }))}
              requiredDocuments={submission.requiredDocuments}
              serviceId={submission.serviceId}
            />
          )}
        </article>

      </section>
    </main>
  );
}
