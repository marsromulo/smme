import Link from "next/link";
import { PageShell } from "../components/PageShell";
import { publicServices } from "../public-services";

const steps = [
  "Review the service requirements and prepare the necessary documents.",
  "Submit the application through the online M&E platform or designated channel.",
  "Respond to validation notes, requests for clarification, or missing documents.",
  "Track the application status and wait for the final action or notice.",
];

export default function ServicesPage() {
  return (
    <PageShell title="Services & Applications">
      <div className="content-stack">
        <section className="section-head">
          <div>
            <span className="eyebrow">Online Services</span>
            <h2>Regulatory Services for Schools</h2>
          </div>
          <p>
            Schools may use this page as a starting point for common regulatory
            applications, documentary submissions, and status tracking handled by the SMME
            Unit.
          </p>
        </section>

        <section className="info-card-grid">
          {publicServices.map((service) => (
            <article className="info-card" key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </article>
          ))}
        </section>

        <section className="two-column">
          <article className="prose-panel">
            <h3>Application Process</h3>
            <ol className="process-list">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
          <article className="cta-panel">
            <h3>Use the M&E Platform</h3>
            <p>
              Submit applications, upload documents, track updates, and receive notices
              through the online platform.
            </p>
            <Link className="btn primary" href="/platform">
              Launch Platform
            </Link>
          </article>
        </section>
      </div>
    </PageShell>
  );
}
