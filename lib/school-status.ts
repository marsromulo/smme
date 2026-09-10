export type StatusField = {
  key: string;
  label: string;
  type?: "date" | "number";
  options?: readonly string[];
  placeholder?: string;
};
export type StatusSection = {
  key: string;
  title: string;
  options: readonly string[];
  details: Record<string, readonly StatusField[]>;
};
export type SchoolStatuses = Record<string, { status: string; details: Record<string, string> }>;

export const schoolStatusSections: readonly StatusSection[] = [
  {
    key: "government", title: "Government Recognition Status",
    options: ["With Permit", "With Recognition", "Pending Application", "For Renewal", "Expired", "Suspended", "Revoked/Cancelled", "No Permit/Recognition"],
    details: {
      "With Permit": [
        { key: "permitStatus", label: "Permit Status", options: ["Valid", "Expired", "Pending", "Suspended", "Revoked"] },
        { key: "permitNumber", label: "Permit Number" },
        { key: "dateIssued", label: "Date Issued", type: "date" },
        { key: "schoolYear", label: "School Year Covered", placeholder: "e.g., 2026–2027" },
        { key: "permitType", label: "Type of Permit", options: ["New", "Renewal", "Additional Grade/Program"] },
        { key: "renewalDate", label: "Date of Renewal", type: "date" },
        { key: "renewalCount", label: "Number of Renewals", type: "number" },
        { key: "latestPermit", label: "Latest Permit/Recognition Issued" },
      ],
      "With Recognition": [
        { key: "recognitionNumber", label: "Recognition Number / Government Recognition No." },
        { key: "recognitionDate", label: "Date of Recognition", type: "date" },
        { key: "schoolYear", label: "School Year Granted/Effective" },
        { key: "gradeLevels", label: "Grade Level/Program Recognized", placeholder: "e.g., Kindergarten, Elementary, JHS, SHS" },
        { key: "recognitionType", label: "Type of Recognition", options: ["Initial", "Renewal", "Reissuance", "Additional Grade or Program"] },
      ],
    },
  },
  {
    key: "esc", title: "Education Service Contracting (ESC) Program Participation Status",
    options: ["ESC Participating School", "Non-Participating School", "Pending/For Approval"],
    details: {
      "ESC Participating School": [
        { key: "schoolCode", label: "ESC School ID / ESC School Code" },
        { key: "participationDate", label: "Date/Year of ESC Participation", placeholder: "e.g., 2026 or 2026-06-01" },
        { key: "schoolYear", label: "School Year Covered" },
        { key: "gradeLevels", label: "Grade Levels Covered", placeholder: "e.g., Grades 7–10" },
        { key: "granteeCount", label: "Number of ESC Grantees", type: "number" },
        { key: "validity", label: "Validity/Expiration of Participation (if applicable)" },
        { key: "certificationDate", label: "Date of Latest Renewal/Certification", type: "date" },
      ],
    },
  },
  {
    key: "shsVoucher", title: "Senior High School Voucher Program Participation Status",
    options: ["SHS Participating School", "Non-Participating School", "Pending/For Approval"],
    details: {
      "SHS Participating School": [
        { key: "schoolCode", label: "SHS Voucher School Code/ID (if applicable)" },
        { key: "schoolYear", label: "School Year Covered" },
        { key: "tracks", label: "SHS Tracks Offered", placeholder: "Academic / TVL / Sports / Arts and Design" },
        { key: "strands", label: "Strands/Specializations Offered" },
        { key: "recipientCount", label: "Number of SHS Voucher Recipients", type: "number" },
        { key: "voucherCategory", label: "Voucher Type/Category", placeholder: "ESC grantee / Qualified Voucher Recipient (QVR), as applicable" },
        { key: "certificationDate", label: "Date of Latest Certification/Approval", type: "date" },
        { key: "validity", label: "Validity/Effectivity (if applicable)" },
      ],
    },
  },
];

export function parseSchoolStatuses(value: unknown): SchoolStatuses {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("School participation statuses are required.");
  }
  const input = value as Record<string, unknown>;
  const result: SchoolStatuses = {};
  for (const section of schoolStatusSections) {
    const entry = input[section.key] as { status?: unknown; details?: unknown } | undefined;
    if (!entry || typeof entry.status !== "string" || !section.options.includes(entry.status)) {
      throw new Error(`Select a valid ${section.title}.`);
    }
    const raw = entry.details && typeof entry.details === "object" ? entry.details as Record<string, unknown> : {};
    const details: Record<string, string> = {};
    for (const field of section.details[entry.status] ?? []) {
      const value = raw[field.key];
      if (value === undefined || value === "") continue;
      if (typeof value !== "string" || value.length > 1000) throw new Error(`Invalid ${field.label}.`);
      const cleaned = value.trim();
      if (!cleaned) continue;
      if (field.options && !field.options.includes(cleaned)) throw new Error(`Invalid ${field.label}.`);
      if (field.type === "number" && (!/^\d+$/.test(cleaned) || !Number.isSafeInteger(Number(cleaned)))) throw new Error(`${field.label} must be a non-negative whole number.`);
      if (field.type === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned) || !Number.isFinite(Date.parse(cleaned)) || new Date(cleaned).toISOString().slice(0, 10) !== cleaned)) throw new Error(`Invalid ${field.label}.`);
      details[field.key] = cleaned;
    }
    result[section.key] = { status: entry.status, details };
  }
  return result;
}
