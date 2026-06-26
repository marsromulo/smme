import Link from "next/link";
import { FileText, FolderOpen } from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";
import {
  formatSubmissionDate,
  formatSubmissionStatus,
  getSubmissionList,
  submissionStatusClass,
} from "@/app/platform/submissions-data";

export default async function PlatformSubmissionsPage() {
  const session = await getPlatformSession();
  const submissions = await getSubmissionList(session);
  const isAdmin = session.role === "admin";

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <span className="platform-kicker">{isAdmin ? "Review queue" : "My submissions"}</span>
          <h1>{isAdmin ? "Service Submissions" : "My Submissions"}</h1>
          <p>
            {isAdmin
              ? "Review submitted service applications and uploaded documents."
              : "Track submitted applications and open uploaded document packages."}
          </p>
        </div>
      </section>

      <section className="platform-section">
        <div className="platform-section-head">
          <div>
            <span className="platform-kicker">Applications</span>
            <h2>{isAdmin ? "Recent Submissions" : "Applied Services"}</h2>
          </div>
        </div>

        {submissions.length === 0 ? (
          <p className="platform-empty-state">No service submissions found.</p>
        ) : (
          <div className="platform-table-wrap">
            <table className="platform-table platform-submissions-table">
              <thead>
                <tr>
                  <th>Service</th>
                  {isAdmin ? <th>School</th> : null}
                  <th>Files</th>
                  {isAdmin ? <th>Unassigned Documents</th> : null}
                  <th>Status</th>
                  <th>Last submitted</th>
                  {isAdmin ? null : <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="platform-submission-service-cell">
                      <Link href={`/platform/submissions/${submission.id}`}>
                        <span className="platform-table-service-title">
                          <FileText aria-hidden="true" size={17} />
                          {submission.serviceName}
                        </span>
                      </Link>
                    </td>
                    {isAdmin ? (
                      <td className="platform-submission-school-cell">
                        {submission.schoolSlug ? (
                          <Link href={`/platform/schools/${submission.schoolSlug}`}>
                            {submission.schoolName}
                          </Link>
                        ) : (
                          submission.schoolName
                        )}
                      </td>
                    ) : null}
                    <td className="platform-submission-compact-cell">{submission.fileCount}</td>
                    {isAdmin ? (
                      <td className="platform-submission-compact-cell">
                        {submission.unassignedFileCount}
                      </td>
                    ) : null}
                    <td className="platform-submission-compact-cell">
                      <span className={submissionStatusClass(submission.status)}>
                        {formatSubmissionStatus(submission.status)}
                      </span>
                    </td>
                    <td className="platform-submission-date-cell">{formatSubmissionDate(submission.submittedAt)}</td>
                    {isAdmin ? null : (
                      <td className="platform-submission-compact-cell">
                        <Link className="platform-table-action" href={`/platform/submissions/${submission.id}`}>
                          <FolderOpen aria-hidden="true" size={16} />
                          Open
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
