"use client";

import { schoolStatusSections, type StatusSection, type SchoolStatuses } from "@/lib/school-status";

export function SchoolStatusFields({ value, onChange, disabled = false, sections = schoolStatusSections.filter((section) => section.key !== "government"), curriculum }: { value: SchoolStatuses; onChange: (value: SchoolStatuses) => void; disabled?: boolean; sections?: readonly StatusSection[]; curriculum?: string }) {
  return sections.map((section) => {
    const entry = value[section.key] ?? { status: "", details: {} };
    return (
      <fieldset key={section.key} disabled={disabled}>
        <legend>{curriculum ? "Government Recognition Status" : section.title} *</legend>
        <label className="school-register-wide">
          <span>Status (required)</span>
          <select aria-label={section.title} required value={entry.status} onChange={(event) => onChange({ ...value, [section.key]: { status: event.target.value, details: {} } })}>
            <option value="">Select status</option>
            {section.options.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        {(section.details[entry.status] ?? []).map((field) => {
          const props = {
            value: entry.details[field.key] ?? "",
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [section.key]: { ...entry, details: { ...entry.details, [field.key]: event.target.value } } }),
          };
          if (field.type === "file") {
            return (
              <div key={`${section.key}:${entry.status}:${field.key}`} className="school-register-wide">
                <label>
                  <span>{field.label} *</span>
                  <input type="file" name={`${section.key}:${field.key}`} accept="application/pdf,image/jpeg,image/png" required={!entry.details[field.key]} />
                </label>
                <small>PDF, JPG, or PNG. Maximum 1 MB.</small>
                {entry.details[field.key] ? <p><a href={`/api/platform/status-documents?key=${encodeURIComponent(entry.details[field.key])}`} target="_blank" rel="noreferrer">View uploaded copy</a> — choose a file to replace it.</p> : null}
              </div>
            );
          }
          return (
            <label key={field.key}>
              <span>{field.label}</span>
              {field.options ? (
                <select {...props}>
                  <option value="">Select an option</option>
                  {field.options.map((option) => <option key={option}>{option}</option>)}
                </select>
              ) : <input {...props} type={field.type ?? "text"} min={field.type === "number" ? 0 : undefined} step={field.type === "number" ? 1 : undefined} maxLength={1000} placeholder={field.placeholder} />}
            </label>
          );
        })}
      </fieldset>
    );
  });
}
