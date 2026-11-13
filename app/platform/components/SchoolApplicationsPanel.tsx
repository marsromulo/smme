import Link from "next/link";
import type { getSchoolApplications } from "../school-applications";
import { formatSubmissionDate, formatSubmissionStatus, submissionStatusClass } from "../submissions-data";

type Applications = Awaited<ReturnType<typeof getSchoolApplications>>;

export function SchoolApplicationsPanel({ applications }: { applications: Applications }) {
  return <>
    <section className="platform-section" id="school-applications">
      <div className="platform-section-head"><h2>Applications ({applications.length})</h2></div>
      {applications.length ? <div className="platform-table-wrap"><table className="platform-table">
        <thead><tr><th>Service</th><th>Submitted Files</th><th>Status</th><th>Submitted</th><th>Action</th></tr></thead>
        <tbody>{applications.map((application) => <tr key={application.id}>
          <td><Link href={`/platform/submissions/${application.id}`}>{application.serviceName}</Link></td>
          <td>{application.files.length}</td>
          <td><span className={submissionStatusClass(application.status)}>{formatSubmissionStatus(application.status)}</span></td>
          <td>{formatSubmissionDate(application.submitted_at)}</td>
          <td><Link className="platform-table-action" href={`/platform/submissions/${application.id}`}>View Application</Link></td>
        </tr>)}</tbody>
      </table></div> : <p className="platform-empty-state">No applications submitted by this school yet.</p>}
    </section>
    <section className="platform-section" id="school-documents">
      <div className="platform-section-head"><h2>Reviewed and Submitted Files</h2></div>
      {applications.some((application) => application.files.length) ? applications.filter((application) => application.files.length).map((application) => <div key={application.id}>
        <h3><Link href={`/platform/submissions/${application.id}`}>{application.serviceName}</Link></h3>
        <div className="platform-table-wrap"><table className="platform-table">
          <thead><tr><th>Document</th><th>Review Status</th><th>Uploaded</th><th>Actions</th></tr></thead>
          <tbody>{application.files.map((file) => <tr key={file.id}>
            <td>{file.original_name}</td>
            <td>{file.review_status === "invalid" ? "Replaced / Invalid" : file.review_status.replaceAll("_", " ")}</td>
            <td>{formatSubmissionDate(file.uploaded_at ?? file.created_at)}</td>
            <td>
              <a className="platform-table-action" href={`/api/platform/application-files/${file.id}/download`} target="_blank" rel="noreferrer">View</a>{" "}
              <a className="platform-table-action" href={`/api/platform/application-files/${file.id}/download?disposition=attachment`}>Download</a>{" "}
              <Link className="platform-table-action" href={`/platform/submissions/${application.id}`}>Review</Link>
            </td>
          </tr>)}</tbody>
        </table></div>
      </div>) : <p className="platform-empty-state">No files submitted by this school yet.</p>}
    </section>
  </>;
}
