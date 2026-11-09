"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SchoolProfile } from "@/lib/school-profile";
import { CurriculumFields } from "./CurriculumFields";
import { prepareSchoolForm, readSchoolFormResponse, schoolFormErrorMessage } from "@/lib/school-form-client";
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
      data.set("payload", JSON.stringify({
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
        }));
      const response = await fetch("/api/platform/profile/school", {
        method: "PATCH",
        body: prepareSchoolForm(data),
      });
      const result = await readSchoolFormResponse(response);
      setStatuses(result.schoolStatuses ?? statuses);
      setMessage("School profile saved.");
      router.refresh();
    } catch (error) {
      setError(schoolFormErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="school-register-form" onSubmit={save} onChange={() => { setMessage(""); setError(""); }}>
      <fieldset disabled={saving}>
        <legend>School Information</legend>
        <label className="school-register-wide"><span>School Name</span><input value={school.school_name} disabled className="school-profile-locked-field" /></label>
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
        {registrantType ? (
          <>
            <label className="school-register-wide"><span>Home Address *</span><input name="homeAddress" defaultValue={school.home_address ?? ""} required maxLength={1000} /></label>
            <label className="school-register-wide"><span>Contact Number *</span><input name="contactNumber" type="tel" defaultValue={school.contact_number ?? ""} required maxLength={50} /></label>
          </>
        ) : null}
        <label className="school-register-wide"><span>District *</span><input name="schoolDistrict" defaultValue={school.school_district ?? ""} placeholder="Enter district" required maxLength={200} /></label>
        <label className="school-register-wide"><span>School Address *</span><input name="schoolAddress" defaultValue={school.school_address ?? ""} placeholder="Enter complete school address" required maxLength={1000} /></label>
      </fieldset>
      <CurriculumFields offerings={offerings} onOfferingsChange={setOfferings} statuses={statuses} onStatusesChange={setStatuses} disabled={saving} />
      <SchoolStatusFields value={statuses} onChange={setStatuses} disabled={saving} />
      <fieldset disabled={saving}>
        <legend>School Contact Information</legend>
        <label><span>Position / Designation *</span><input name="representativePosition" defaultValue={school.representative_position ?? ""} placeholder="Enter your position" required maxLength={200} /></label>
        <label><span>Email Address</span><input type="email" value={school.representative_email} disabled className="school-profile-locked-field" /></label>
      </fieldset>
      {error ? <p role="alert" className="platform-assignment-message error">{error}</p> : null}
      {message ? <p role="status" className="platform-assignment-message success">{message}</p> : null}
      <button className="platform-btn primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
    </form>
  );
}
