import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Clock3, Search, XCircle } from "lucide-react";
import { type School, schools } from "../../data";
import { getApprovedSchoolRecords } from "../../school-records";

function statusIcon(status: string) {
  if (status === "Approved") {
    return <CheckCircle2 aria-hidden="true" size={15} />;
  }

  if (status === "Rejected") {
    return <XCircle aria-hidden="true" size={15} />;
  }

  return <Clock3 aria-hidden="true" size={15} />;
}

export default async function PlatformSchoolsPage() {
  let approvedSchools: School[] = [];
  let schoolRecordsError: string | null = null;

  try {
    approvedSchools = await getApprovedSchoolRecords();
  } catch (error) {
    schoolRecordsError = error instanceof Error ? error.message : "Unable to load approved schools.";
  }

  const listedSchools = [...approvedSchools, ...schools];

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <span className="platform-kicker">School registry</span>
          <h1>Schools</h1>
          <p>Select a school name to view its full profile, documents, programs, and service history.</p>
        </div>
        <Link className="platform-btn primary" href="/platform/register">
          <Building2 aria-hidden="true" size={18} />
          Add School
        </Link>
      </section>

      <section className="platform-filter-bar school-list">
        <div className="platform-input-like">
          <Search aria-hidden="true" size={18} />
          <span>Search school name</span>
        </div>
      </section>

      <section className="platform-section platform-school-directory">
        <div className="platform-school-directory-head">
          <span>School Name</span>
          <span>Registration Status</span>
          <span>Details</span>
        </div>
        <div className="platform-school-name-list">
          {schoolRecordsError ? (
            <p className="platform-empty-state">
              Approved database schools could not be loaded: {schoolRecordsError}
            </p>
          ) : null}
          {listedSchools.map((school) => (
            <Link
              className="platform-school-name-row"
              href={`/platform/schools/${school.slug}`}
              key={school.slug}
            >
              <span className="platform-school-name">
                <Building2 aria-hidden="true" size={20} />
                <strong>{school.name}</strong>
              </span>
              <span
                className={`platform-pill registration-${school.registrationStatus.toLowerCase()}`}
              >
                {statusIcon(school.registrationStatus)}
                {school.registrationStatus}
              </span>
              <span className="platform-school-open">
                View full detail <ArrowRight aria-hidden="true" size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
