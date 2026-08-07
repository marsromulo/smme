"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";

type SchoolProfileFormValue = {
  contactNumber: string;
  representativeEmail: string;
  representativeName: string;
  representativePosition: string;
  schoolAddress: string;
  schoolDistrict: string;
  schoolId: string;
  schoolName: string;
  schoolOfferings: string[];
  schoolType: string;
};

const standardOfferings = ["Elementary", "Junior High School", "Senior High School"];

export function SchoolProfileForm({ initialValue }: { initialValue: SchoolProfileFormValue }) {
  const [form, setForm] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field: keyof Omit<SchoolProfileFormValue, "schoolOfferings">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setMessage("");
  }

  function toggleOffering(offering: string) {
    setForm((current) => ({
      ...current,
      schoolOfferings: current.schoolOfferings.includes(offering)
        ? current.schoolOfferings.filter((item) => item !== offering)
        : [...current.schoolOfferings, offering],
    }));
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/platform/profile/school", {
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update school profile.");
      }

      setMessage("School profile updated.");
      window.location.reload();
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Unable to update school profile.");
      setIsSaving(false);
    }
  }

  return (
    <form className="platform-profile-form school" onSubmit={handleSubmit}>
      <label className="wide">
        <span>School Name</span>
        <input required value={form.schoolName} onChange={(event) => updateField("schoolName", event.target.value)} />
      </label>
      <label>
        <span>School ID</span>
        <input value={form.schoolId} onChange={(event) => updateField("schoolId", event.target.value)} />
      </label>
      <label>
        <span>School Type</span>
        <input value={form.schoolType} onChange={(event) => updateField("schoolType", event.target.value)} />
      </label>
      <label>
        <span>District</span>
        <input required value={form.schoolDistrict} onChange={(event) => updateField("schoolDistrict", event.target.value)} />
      </label>
      <label className="wide">
        <span>School Address</span>
        <textarea required rows={3} value={form.schoolAddress} onChange={(event) => updateField("schoolAddress", event.target.value)} />
      </label>
      <fieldset className="wide">
        <legend>Curriculum Offerings</legend>
        <div className="platform-profile-offerings">
          {standardOfferings.map((offering) => (
            <label key={offering}>
              <input
                type="checkbox"
                checked={form.schoolOfferings.includes(offering)}
                onChange={() => toggleOffering(offering)}
              />
              <span>{offering}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        <span>Representative Name</span>
        <input required value={form.representativeName} onChange={(event) => updateField("representativeName", event.target.value)} />
      </label>
      <label>
        <span>Position / Designation</span>
        <input required value={form.representativePosition} onChange={(event) => updateField("representativePosition", event.target.value)} />
      </label>
      <label className="wide">
        <span>Registered Email Address</span>
        <input type="email" value={form.representativeEmail} readOnly aria-readonly="true" />
        <small>The registered account email cannot be changed.</small>
      </label>
      <label>
        <span>Contact Number</span>
        <input required type="tel" value={form.contactNumber} onChange={(event) => updateField("contactNumber", event.target.value)} />
      </label>

      {error ? <p className="platform-form-message error wide">{error}</p> : null}
      {message ? <p className="platform-form-message success wide">{message}</p> : null}

      <div className="platform-form-actions wide">
        <button className="platform-btn primary" type="submit" disabled={isSaving}>
          <Save aria-hidden="true" size={17} />
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
