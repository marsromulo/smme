import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MapPin,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { getSchool, schools } from "../../../data";
import { getApprovedSchoolRecordBySlug } from "../../../school-records";

export function generateStaticParams() {
  return schools.map((school) => ({ slug: school.slug }));
}

export default async function PlatformSchoolDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let school = getSchool(slug);

  if (!school) {
    try {
      school = (await getApprovedSchoolRecordBySlug(slug)) ?? undefined;
    } catch {
      school = undefined;
    }
  }

  if (!school) {
    notFound();
  }

  return (
    <main className="platform-page">
      <Link className="platform-back-link" href="/platform/schools">
        <ArrowLeft aria-hidden="true" size={16} />
        Back to schools
      </Link>

      <section className="platform-detail-hero">
        <div>
          <span className="platform-kicker">{school.schoolId}</span>
          <h1>{school.name}</h1>
          <p>{school.type}</p>
          <div className="platform-detail-actions">
            {school.documents[0] ? (
              <Link className="platform-btn primary" href={`/platform/documents/${school.documents[0].id}`}>
                <FileText aria-hidden="true" size={18} />
                Review Documents
              </Link>
            ) : (
              <span className="platform-btn primary disabled">
                <FileText aria-hidden="true" size={18} />
                Review Documents
              </span>
            )}
            <Link className="platform-btn secondary" href="/platform/applications">
              <Clock3 aria-hidden="true" size={18} />
              View Applications
            </Link>
          </div>
        </div>
        <div className="platform-compliance-meter">
          <strong>{school.compliance}%</strong>
          <span>Compliance score</span>
          <div className="platform-progress">
            <span style={{ width: `${school.compliance}%` }} />
          </div>
        </div>
      </section>

      <section className="platform-grid detail">
        <article className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Profile</span>
              <h2>School Information</h2>
            </div>
          </div>
          <dl className="platform-detail-list">
            <div>
              <dt>
                <Building2 aria-hidden="true" size={17} />
                District
              </dt>
              <dd>{school.district}</dd>
            </div>
            <div>
              <dt>
                <MapPin aria-hidden="true" size={17} />
                Address
              </dt>
              <dd>{school.address}</dd>
            </div>
            <div>
              <dt>
                <UserRound aria-hidden="true" size={17} />
                Contact Name
              </dt>
              <dd>{school.principal}</dd>
            </div>
            <div>
              <dt>
                <Mail aria-hidden="true" size={17} />
                Contact
              </dt>
              <dd>{school.contact}</dd>
            </div>
          </dl>
        </article>

        <article className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Programs</span>
              <h2>Offerings & Services</h2>
            </div>
          </div>
          <div className="platform-tag-list">
            {school.programs.map((program) => (
              <span key={program}>{program}</span>
            ))}
          </div>
          <div className="platform-service-list">
            {school.services.map((service) => (
              <div key={service}>
                <CheckCircle2 aria-hidden="true" size={17} />
                {service}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="platform-section">
        <div className="platform-section-head">
          <div>
            <span className="platform-kicker">Documents</span>
            <h2>Reviewed and Submitted Files</h2>
          </div>
          <span className={`platform-pill ${school.status.toLowerCase().replaceAll(" ", "-")}`}>
            {school.status === "Needs action" ? (
              <ShieldAlert aria-hidden="true" size={14} />
            ) : (
              <CheckCircle2 aria-hidden="true" size={14} />
            )}
            {school.status}
          </span>
        </div>
        <div className="platform-document-list">
          {school.documents.length > 0 ? (
            school.documents.map((document) => (
              <Link
                className="platform-document-row"
                href={`/platform/documents/${document.id}`}
                key={document.id}
              >
                <span className="platform-document-icon">
                  <FileText aria-hidden="true" size={21} />
                </span>
                <div>
                  <strong>{document.title}</strong>
                  <small>
                    {document.type} · Submitted {document.submitted}
                  </small>
                </div>
                <span className={`platform-pill ${document.status.toLowerCase().replaceAll(" ", "-")}`}>
                  {document.status}
                </span>
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            ))
          ) : (
            <p className="platform-empty-state">No reviewed documents yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
