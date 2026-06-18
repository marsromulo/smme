import { PageShell } from "../components/PageShell";

const documentGroups = [
  {
    title: "Issuances",
    items: ["Division memoranda", "Advisories", "Office communications"],
  },
  {
    title: "Templates",
    items: ["Application forms", "School report templates", "Submission checklists"],
  },
  {
    title: "Guidelines",
    items: ["Regulatory references", "Process guides", "Frequently used requirements"],
  },
];

export default function DocumentsPage() {
  return (
    <PageShell title="Issuances & Documents">
      <div className="content-stack">
        <section className="section-head">
          <div>
            <span className="eyebrow">Resources</span>
            <h2>Issuances, Forms, and References</h2>
          </div>
          <p>
            This section organizes common documents used by schools for regulatory
            applications, monitoring reports, references, and official communications.
          </p>
        </section>

        <section className="document-grid">
          {documentGroups.map((group) => (
            <article className="document-card" key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="prose-panel">
          <h3>Document Reminders</h3>
          <p>
            Schools should use the latest available forms, ensure that files are complete and
            readable, and follow the naming conventions or submission instructions provided
            for each application. Documents may be updated as new issuances or requirements
            become available.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
