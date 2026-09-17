"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { curriculumOfferings, type SchoolProfile } from "@/lib/school-profile";
import { SchoolStatusFields } from "./SchoolStatusFields";

export function SchoolProfileForm({ school }: { school: SchoolProfile }) {
  const router = useRouter();
  const [registrantType, setRegistrantType] = useState(school.registrant_type ?? "");
  const [statuses, setStatuses] = useState(school.school_statuses ?? {});
  const [offerings, setOfferings] = useState(school.school_offerings ?? []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/platform/profile/school", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrantType,
          ownerName: data.get("ownerName") ?? "",
          representativeName: data.get("representativeName") ?? "",
          homeAddress: data.get("homeAddress"),
          contactNumber: data.get("contactNumber"),
          schoolDistrict: data.get("schoolDistrict"),
          schoolAddress: data.get("schoolAddress"),
          representativePosition: data.get("representativePosition"),
          schoolOfferings: offerings,
          schoolStatuses: statuses,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save profile.");
      setMessage("School profile saved.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="school-register-form" onSubmit={save} onChange={() => { setMessage(""); setError(""); }}>
      <fieldset disabled={saving}>
        <legend>School Information</legend>
        <label><span>School Name</span><input value={school.school_name} readOnly /></label>
        <label><span>Email Address</span><input value={school.representative_email} readOnly /></label>
        <label className="school-register-wide"><span>Registrant Type *</span>
          <select required value={registrantType} onChange={(event) => setRegistrantType(event.target.value)}>
            <option value="">Select registrant type</option>
            <option value="owner">School Owner</option>
            <option value="representative">Representative</option>
          </select>
        </label>
        {registrantType ? <label className="school-register-wide" key={registrantType}>
          <span>{registrantType === "owner" ? "School Owner Name" : "Representative Name"} *</span>
          <input name={registrantType === "owner" ? "ownerName" : "representativeName"} required maxLength={200}
            defaultValue={registrantType === "owner" ? school.owner_name ?? "" : school.registrant_type === "owner" ? "" : school.representative_name} />
        </label> : null}
        <label><span>Home Address *</span><input name="homeAddress" defaultValue={school.home_address ?? ""} required maxLength={1000} /></label>
        <label><span>Contact Number *</span><input name="contactNumber" type="tel" defaultValue={school.contact_number ?? ""} required maxLength={50} /></label>
        <label><span>District *</span><input name="schoolDistrict" defaultValue={school.school_district ?? ""} required maxLength={200} /></label>
        <label><span>School Address *</span><input name="schoolAddress" defaultValue={school.school_address ?? ""} required maxLength={1000} /></label>
        <label><span>Position / Designation *</span><input name="representativePosition" defaultValue={school.representative_position ?? ""} required maxLength={200} /></label>
      </fieldset>
      <fieldset disabled={saving}>
        <legend>Curriculum Offerings</legend>
        <div className="school-register-curriculum-options school-register-wide">
          {curriculumOfferings.map((offering) => <label className="school-register-checkbox-option" key={offering}>
            <input type="checkbox" checked={offerings.includes(offering)} onChange={(event) => setOfferings(event.target.checked ? [...offerings, offering] : offerings.filter((item) => item !== offering))} />
            <span>{offering}</span>
          </label>)}
        </div>
      </fieldset>
      <SchoolStatusFields value={statuses} onChange={setStatuses} disabled={saving} />
      {error ? <p role="alert" className="platform-assignment-message error">{error}</p> : null}
      {message ? <p role="status" className="platform-assignment-message success">{message}</p> : null}
      <button className="platform-btn primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
    </form>
  );
}
