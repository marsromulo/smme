import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  MessageSquareText,
  Printer,
  UserRoundCheck,
} from "lucide-react";
import { getDocument, schools } from "../../../data";

export function generateStaticParams() {
  return schools.flatMap((school) => school.documents.map((document) => ({ id: document.id })));
}

export default async function PlatformDocumentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = getDocument(id);

  if (!result) {
    notFound();
  }

  const { school, document } = result;

  return (
    <main className="platform-page">
      <Link className="platform-back-link" href={`/platform/schools/${school.slug}`}>
        <ArrowLeft aria-hidden="true" size={16} />
        Back to school details
      </Link>

      <section className="platform-page-head document">
        <div>
          <span className="platform-kicker">{document.type}</span>
          <h1>{document.title}</h1>
          <p>{school.name}</p>
        </div>
        <div className="platform-detail-actions">
          <button className="platform-btn secondary" type="button">
            <Printer aria-hidden="true" size={18} />
            Print
          </button>
          <button className="platform-btn primary" type="button">
            <Download aria-hidden="true" size={18} />
            Download
          </button>
        </div>
      </section>

      <section className="platform-grid document">
        <article className="platform-document-preview">
          <div className="platform-document-paper">
            <div className="platform-paper-head">
              <FileText aria-hidden="true" size={34} />
              <div>
                <strong>Schools Division of Baguio City</strong>
                <span>School Management, Monitoring, and Evaluation Unit</span>
              </div>
            </div>
            <h2>{document.title}</h2>
            <dl>
              <div>
                <dt>School</dt>
                <dd>{school.name}</dd>
              </div>
              <div>
                <dt>School ID</dt>
                <dd>{school.schoolId}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{document.submitted}</dd>
              </div>
              <div>
                <dt>Reviewed</dt>
                <dd>{document.reviewed}</dd>
              </div>
            </dl>
            <div className="platform-paper-block" />
            <div className="platform-paper-lines">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </article>

        <aside className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Review result</span>
              <h2>Evaluation Details</h2>
            </div>
          </div>
          <div className="platform-review-status">
            <FileCheck2 aria-hidden="true" size={24} />
            <div>
              <span className={`platform-pill ${document.status.toLowerCase().replaceAll(" ", "-")}`}>
                {document.status}
              </span>
              <strong>{document.reviewer}</strong>
              <small>Reviewer assigned</small>
            </div>
          </div>
          <dl className="platform-review-meta">
            <div>
              <dt>Submitted</dt>
              <dd>{document.submitted}</dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd>{document.reviewed}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{school.principal}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="platform-section">
        <div className="platform-section-head compact">
          <div>
            <span className="platform-kicker">Notes</span>
            <h2>Reviewer Notes</h2>
          </div>
        </div>
        <div className="platform-note-list">
          {document.notes.map((note) => (
            <div className="platform-note" key={note}>
              {document.status === "Approved" ? (
                <CheckCircle2 aria-hidden="true" size={18} />
              ) : (
                <MessageSquareText aria-hidden="true" size={18} />
              )}
              <p>{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-section">
        <div className="platform-section-head compact">
          <div>
            <span className="platform-kicker">Activity</span>
            <h2>Review Timeline</h2>
          </div>
        </div>
        <div className="platform-timeline">
          <div>
            <span />
            <strong>Document submitted</strong>
            <p>{document.submitted}</p>
          </div>
          <div>
            <span />
            <strong>Evaluator review</strong>
            <p>{document.reviewed}</p>
          </div>
          <div>
            <span />
            <strong>School representative notified</strong>
            <p>Static notification preview</p>
          </div>
          <div>
            <span />
            <strong>
              <UserRoundCheck aria-hidden="true" size={16} />
              Next action
            </strong>
            <p>Proceed based on the status and notes shown above.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
