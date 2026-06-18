import { PageShell } from "../components/PageShell";

const focusAreas = [
  {
    title: "School Governance",
    text: "Supports schools in complying with standards, policies, and approval requirements for basic education operations.",
  },
  {
    title: "Monitoring and Evaluation",
    text: "Uses reports, school visits, and submitted evidence to review implementation, identify gaps, and guide improvement.",
  },
  {
    title: "Regulatory Support",
    text: "Assists private schools and learning centers with applications, updates, and documentary requirements.",
  },
];

export default function AboutPage() {
  return (
    <PageShell title="About Us">
      <div className="content-stack">
        <section className="section-head">
          <div>
            <span className="eyebrow">Who We Are</span>
            <h2>School Management, Monitoring, and Evaluation Unit</h2>
          </div>
          <p>
            The SMME Unit supports the Schools Division of Baguio City in promoting
            accountable, compliant, and continuously improving schools through governance,
            monitoring, evaluation, and technical assistance.
          </p>
        </section>

        <section className="prose-panel">
          <h3>Our Role</h3>
          <p>
            We work with school heads, administrators, stakeholders, and partner offices to
            ensure that regulatory processes are clear, requirements are complete, and school
            improvement efforts are guided by evidence. Our work covers applications,
            monitoring activities, reporting, and coordination for services that help schools
            operate responsibly and effectively.
          </p>
        </section>

        <section className="info-card-grid">
          {focusAreas.map((item) => (
            <article className="info-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="two-column">
          <article className="prose-panel">
            <h3>Mission</h3>
            <p>
              To provide responsive monitoring, evaluation, and regulatory support that helps
              schools deliver safe, compliant, and quality basic education services.
            </p>
          </article>
          <article className="prose-panel">
            <h3>Service Commitment</h3>
            <p>
              We aim to make application processes transparent, document requirements easier
              to understand, and communication with schools timely and professional.
            </p>
          </article>
        </section>
      </div>
    </PageShell>
  );
}
