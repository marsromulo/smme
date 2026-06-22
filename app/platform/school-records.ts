import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type School, schools } from "./data";

type SchoolRecordRow = {
  id: string;
  school_registration_request_id: string | null;
  slug: string;
  school_name: string;
  school_id: string | null;
  school_type: string | null;
  school_district: string | null;
  school_address: string | null;
  school_offerings: string[] | null;
  representative_name: string;
  representative_email: string;
  contact_number: string | null;
  status: "active" | "inactive" | "for_validation";
  created_at: string;
};

type ApprovedRegistrationRow = {
  id: string;
  school_name: string;
  school_id: string | null;
  school_type: string | null;
  school_district: string | null;
  school_address: string | null;
  school_offerings: string[] | null;
  representative_name: string;
  representative_email: string;
  contact_number: string | null;
  created_at: string;
};

export function slugifySchoolName(name: string, id: string) {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "school";

  return `${base}-${id.slice(0, 8)}`;
}

function registrationStatus(status: SchoolRecordRow["status"]): School["registrationStatus"] {
  return status === "inactive" ? "Rejected" : "Approved";
}

function schoolStatus(status: SchoolRecordRow["status"]): School["status"] {
  if (status === "for_validation") {
    return "For validation";
  }

  return status === "inactive" ? "Needs action" : "Active";
}

function normalizedOfferings(offerings: string[] | null) {
  return offerings?.length ? offerings : ["Registered School"];
}

export function schoolRecordToSchool(record: SchoolRecordRow): School {
  const offerings = normalizedOfferings(record.school_offerings);

  return {
    slug: record.slug,
    name: record.school_name,
    schoolId: record.school_id ?? `SMME-${record.id.slice(0, 8).toUpperCase()}`,
    type: record.school_type ?? "Registered School",
    district: record.school_district ?? "Not provided",
    address: record.school_address ?? "Not provided",
    contact: record.representative_email,
    principal: record.representative_name,
    registrationStatus: registrationStatus(record.status),
    status: schoolStatus(record.status),
    compliance: 0,
    pending: 0,
    lastActivity: "Registration approved",
    programs: offerings,
    services: ["School Registration"],
    documents: [],
  };
}

export function approvedRegistrationToSchool(registration: ApprovedRegistrationRow): School {
  const offerings = normalizedOfferings(registration.school_offerings);

  return {
    slug: slugifySchoolName(registration.school_name, registration.id),
    name: registration.school_name,
    schoolId: registration.school_id ?? `SMME-${registration.id.slice(0, 8).toUpperCase()}`,
    type: registration.school_type ?? "Registered School",
    district: registration.school_district ?? "Not provided",
    address: registration.school_address ?? "Not provided",
    contact: registration.representative_email,
    principal: registration.representative_name,
    registrationStatus: "Approved",
    status: "Active",
    compliance: 0,
    pending: 0,
    lastActivity: "Registration approved",
    programs: offerings,
    services: ["School Registration"],
    documents: [],
  };
}

export async function getApprovedSchoolRecords() {
  const supabase = createSupabaseAdminClient();
  const { data: schoolRecordsData } = await supabase
    .from("schools")
    .select(
      "id, school_registration_request_id, slug, school_name, school_id, school_type, school_district, school_address, school_offerings, representative_name, representative_email, contact_number, status, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: approvedRegistrations, error: approvedRegistrationsError } = await supabase
    .from("school_registration_requests")
    .select(
      "id, school_name, school_id, school_type, school_district, school_address, school_offerings, representative_name, representative_email, contact_number, created_at",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (approvedRegistrationsError) {
    throw new Error(approvedRegistrationsError.message);
  }

  const staticSlugs = new Set(schools.map((school) => school.slug));
  const schoolRecords = (schoolRecordsData ?? []) as SchoolRecordRow[];
  const linkedRegistrationIds = new Set(
    schoolRecords.map((record) => record.school_registration_request_id).filter(Boolean),
  );
  const mappedSchoolRecords = schoolRecords
    .filter((record) => record.slug && !staticSlugs.has(record.slug))
    .map(schoolRecordToSchool);
  const mappedApprovedRegistrations = ((approvedRegistrations ?? []) as ApprovedRegistrationRow[])
    .filter((registration) => !linkedRegistrationIds.has(registration.id))
    .map(approvedRegistrationToSchool)
    .filter((school) => !staticSlugs.has(school.slug));

  return [...mappedSchoolRecords, ...mappedApprovedRegistrations];
}

export async function getApprovedSchoolRecordBySlug(slug: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("schools")
    .select(
      "id, school_registration_request_id, slug, school_name, school_id, school_type, school_district, school_address, school_offerings, representative_name, representative_email, contact_number, status, created_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (data) {
    return schoolRecordToSchool(data as SchoolRecordRow);
  }

  const { data: approvedRegistrations, error: approvedRegistrationsError } = await supabase
    .from("school_registration_requests")
    .select(
      "id, school_name, school_id, school_type, school_district, school_address, school_offerings, representative_name, representative_email, contact_number, created_at",
    )
    .eq("status", "approved");

  if (approvedRegistrationsError) {
    throw new Error(approvedRegistrationsError.message);
  }

  const registration = ((approvedRegistrations ?? []) as ApprovedRegistrationRow[]).find(
    (item) => slugifySchoolName(item.school_name, item.id) === slug,
  );

  return registration ? approvedRegistrationToSchool(registration) : null;
}
