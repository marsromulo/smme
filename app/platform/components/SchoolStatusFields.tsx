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
