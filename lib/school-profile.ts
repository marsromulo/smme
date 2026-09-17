import { parseSchoolStatuses, type SchoolStatuses } from "./school-status";

export const curriculumOfferings = ["Kindergarten", "Elementary", "Junior High School", "Senior High School"];

export type SchoolProfile = {
  registrant_type?: string | null;
  owner_name?: string | null;
  home_address?: string | null;
  contact_number: string | null;
  representative_name: string;
  representative_position: string | null;
  representative_email: string;
  school_name: string;
  school_district: string | null;
  school_address: string | null;
  school_offerings: string[] | null;
  school_statuses?: SchoolStatuses;
};

function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(`${label} is required (maximum ${max} characters).`);
  }
  return value.trim();
}

export function parseRegistrant(record: Record<string, unknown>) {
  const registrantType = record.registrantType;
  if (registrantType !== "owner" && registrantType !== "representative") throw new Error("Select a registrant type.");
  const name = requiredText(registrantType === "owner" ? record.ownerName : record.representativeName,
    registrantType === "owner" ? "School owner name" : "Representative name", 200);
  return {
    registrantType: registrantType as "owner" | "representative",
    ownerName: registrantType === "owner" ? name : "",
    representativeName: name,
    homeAddress: requiredText(record.homeAddress, "Home address", 1000),
    contactNumber: requiredText(record.contactNumber, "Contact number", 50),
  };
}

export function parseSchoolProfileUpdate(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid profile.");
  const record = body as Record<string, unknown>;
  // Never accept identity, ownership, or approval fields from a school.
  const allowed = ["registrantType", "ownerName", "representativeName", "homeAddress", "contactNumber",
    "schoolDistrict", "schoolAddress", "representativePosition", "schoolOfferings", "schoolStatuses"];
  if (Object.keys(record).some((key) => !allowed.includes(key))) throw new Error("The profile contains a field that cannot be edited.");
  const registrant = parseRegistrant(record);
  if (!Array.isArray(record.schoolOfferings) || record.schoolOfferings.some((item) => !curriculumOfferings.includes(item))) {
    throw new Error("Select valid curriculum offerings.");
  }
  return {
    registrant_type: registrant.registrantType,
    owner_name: registrant.ownerName || null,
    representative_name: registrant.representativeName,
    home_address: registrant.homeAddress,
    contact_number: registrant.contactNumber,
    school_district: requiredText(record.schoolDistrict, "District", 200),
    school_address: requiredText(record.schoolAddress, "School address", 1000),
    representative_position: requiredText(record.representativePosition, "Position / Designation", 200),
    school_offerings: [...new Set(record.schoolOfferings as string[])],
    school_statuses: parseSchoolStatuses(record.schoolStatuses),
  };
}
