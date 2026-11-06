"use client";

import { curriculumOfferings, governmentSection, type SchoolStatuses } from "@/lib/school-status";
import { SchoolStatusFields } from "./SchoolStatusFields";

export function CurriculumFields({ offerings, onOfferingsChange, statuses, onStatusesChange, disabled = false }: {
  offerings: string[];
  onOfferingsChange: (offerings: string[]) => void;
  statuses: SchoolStatuses;
  onStatusesChange: (statuses: SchoolStatuses) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend>Curriculum Offerings</legend>
      <div className="school-register-curriculum-options school-register-wide">
        {curriculumOfferings.map((offering) => (
          <div key={offering} className="school-register-curriculum-row">
            <label className="school-register-checkbox-option">
              <input type="checkbox" checked={offerings.includes(offering)} onChange={(event) => onOfferingsChange(event.target.checked ? [...offerings, offering] : offerings.filter((item) => item !== offering))} />
              <span>{offering}</span>
            </label>
            {offerings.includes(offering) ? (
              <SchoolStatusFields value={statuses} onChange={onStatusesChange} disabled={disabled} sections={[governmentSection(offering)]} curriculum={offering} />
            ) : null}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
