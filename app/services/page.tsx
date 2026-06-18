import { PageShell } from "../components/PageShell";

const services = [
  "Government Permit to Operate",
  "Recognition of schools and academic programs",
  "Tuition and Other School Fees Increase applications",
  "Establishment of new schools, branch campuses, and additional programs",
  "Change of school name, ownership, or location",
  "Senior High School permit applications",
];

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
          {services.map((service) => (
            <article className="info-card" key={service}>
              <h3>{service}</h3>
              <p>
                Prepare the required documents, submit the application, and coordinate with
                the unit for review, validation, and next steps.
              </p>
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
            <a className="btn primary" href="#">
              Launch Platform
            </a>
          </article>
        </section>
      </div>
    </PageShell>
  );
}
