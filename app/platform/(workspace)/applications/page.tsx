import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  Send,
} from "lucide-react";
import { requirements, serviceQueue, schools } from "../../data";

const stages = [
  { label: "Screening", value: "8" },
  { label: "Evaluation", value: "6" },
  { label: "Inspection", value: "3" },
  { label: "Release", value: "1" },
];

export default function PlatformApplicationsPage() {
  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <span className="platform-kicker">Application queue</span>
          <h1>Applications</h1>
          <p>Static view of service requests, review stages, and documentary requirements.</p>
        </div>
        <Link className="platform-btn primary" href="/platform/schools">
          <Send aria-hidden="true" size={18} />
          Select School
        </Link>
      </section>

      <section className="platform-stage-grid">
        {stages.map((stage) => (
          <article className="platform-stage-card" key={stage.label}>
            <span>{stage.label}</span>
            <strong>{stage.value}</strong>
          </article>
        ))}
      </section>

      <section className="platform-grid applications">
        <div className="platform-section">
          <div className="platform-section-head">
            <div>
              <span className="platform-kicker">Queue</span>
              <h2>Open Requests</h2>
            </div>
          </div>
          <div className="platform-application-list">
            {serviceQueue.map((item, index) => {
              const Icon = item.icon;
              const school = schools[index % schools.length];

              return (
                <Link
                  className="platform-application-row"
                  href={`/platform/schools/${school.slug}`}
                  key={item.label}
                >
                  <span className="platform-application-icon">
                    <Icon aria-hidden="true" size={22} />
                  </span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.school}</small>
                  </div>
                  <em>{item.status}</em>
                  <b>{item.due}</b>
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Checklist</span>
              <h2>Requirements</h2>
            </div>
          </div>
          <div className="platform-requirement-list">
            {requirements.map((requirement) => {
              const Icon = requirement.icon;

              return (
                <div className="platform-requirement-item" key={requirement.label}>
                  <Icon aria-hidden="true" size={20} />
                  <div>
                    <strong>{requirement.label}</strong>
                    <small>{requirement.state}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      <section className="platform-grid two">
        <article className="platform-process-panel">
          <ClipboardList aria-hidden="true" size={26} />
          <h2>Submission Intake</h2>
          <p>Schools submit application details and required attachments for initial screening.</p>
        </article>
        <article className="platform-process-panel">
          <FileSearch aria-hidden="true" size={26} />
          <h2>Evaluator Review</h2>
          <p>Documents are checked, returned for revision, approved, or routed for inspection.</p>
        </article>
        <article className="platform-process-panel">
          <CalendarCheck2 aria-hidden="true" size={26} />
          <h2>Inspection Schedule</h2>
          <p>On-site validation and program-specific checks are coordinated with the school.</p>
        </article>
        <article className="platform-process-panel">
          <ClipboardCheck aria-hidden="true" size={26} />
          <h2>Final Action</h2>
          <p>Approved requests move to release, records, notices, and transaction history.</p>
        </article>
      </section>
    </main>
  );
}
