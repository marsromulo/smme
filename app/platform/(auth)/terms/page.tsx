import Link from "next/link";

export default function PlatformTermsPage() {
  return (
    <main className="platform-legal-page">
      <section className="platform-legal-card">
        <span className="platform-kicker">SMME Platform</span>
        <h1>Terms of Service</h1>
        <p>
          These terms describe the general conditions for using the SMME Platform.
          By registering and using the platform, the school representative agrees to
          use the system for authorized school-related submissions, monitoring, and
          communication with the Schools Division Office.
        </p>

        <h2>Authorized Use</h2>
        <p>
          Users must provide accurate registration information, keep account access
          confidential, and submit only documents and information related to official
          school applications or compliance requirements.
        </p>

        <h2>Submitted Information</h2>
        <p>
          Documents and registration details submitted through the platform may be
          reviewed by authorized SMME administrators for validation, processing, and
          status updates. Users are responsible for ensuring that uploaded files are
          complete, readable, and accurate.
        </p>

        <h2>Platform Availability</h2>
        <p>
          The platform may be updated, maintained, or temporarily unavailable when
          necessary. The SMME team may revise features, workflows, and requirements
          to improve service delivery and comply with administrative needs.
        </p>

        <h2>User Responsibilities</h2>
        <p>
          Users should not share login credentials, upload harmful files, misuse the
          system, or attempt to access information that does not belong to their
          school. Any suspected unauthorized activity should be reported to the SMME
          administrator.
        </p>

        <Link className="platform-legal-back" href="/platform/register">
          Back to Registration
        </Link>
      </section>
    </main>
  );
}
