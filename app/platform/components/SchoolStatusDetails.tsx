import { curriculumOfferings, governmentSection, schoolStatusSections, type SchoolStatuses } from "@/lib/school-status";

export function SchoolStatusDetails({ value }: { value?: SchoolStatuses | null }) {
  const curriculumSections = curriculumOfferings.map(governmentSection).filter((section) => value?.[section.key]);
  const sections = [...curriculumSections, ...schoolStatusSections.filter((section) => section.key !== "government" || (curriculumSections.length === 0 && value?.government))];
  return (
    <div className="school-status-details">
      {sections.map((section) => {
        const entry = value?.[section.key];
        return (
          <section className="platform-section" key={section.key}>
            <div className="platform-section-head compact"><h2>{section.title}</h2></div>
            <dl className="platform-detail-list">
              <div><dt>Status</dt><dd>{entry?.status || "Not provided"}</dd></div>
              {(section.details[entry?.status ?? ""] ?? []).map((field) => (
                <div key={field.key}><dt>{field.label}</dt><dd>{entry?.details?.[field.key] || "Not provided"}</dd></div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
