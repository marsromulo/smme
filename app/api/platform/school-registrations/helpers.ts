import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SchoolRegistrationPayload = {
  schoolName: string;
  schoolId?: string;
  schoolType?: string;
  schoolDistrict?: string;
  schoolAddress?: string;
  schoolOfferings: string[];
  representativeName: string;
  representativePosition?: string;
  representativeEmail: string;
  contactNumber?: string;
  password: string;
};

export type RegistrationDecision = {
  status: "pending" | "approved" | "rejected";
  adminNotes?: string;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => cleanString(item))
        .filter(Boolean)
        .map((item) => item.replace(/\s+/g, " ")),
    ),
  );
}

export function parseSchoolRegistrationPayload(body: unknown): {
  data?: SchoolRegistrationPayload;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { error: "Request body is required." };
  }

  const record = body as Record<string, unknown>;
  const schoolName = cleanString(record.schoolName);
  const schoolId = cleanString(record.schoolId);
  const schoolType = cleanString(record.schoolType);
  const schoolDistrict = cleanString(record.schoolDistrict);
  const schoolAddress = cleanString(record.schoolAddress);
  const schoolOfferings = cleanStringList(record.schoolOfferings);
  const representativeName = cleanString(record.representativeName);
  const representativePosition = cleanString(record.representativePosition);
  const representativeEmail = cleanString(record.representativeEmail).toLowerCase();
  const contactNumber = cleanString(record.contactNumber || record.mobileNumber);
  const password = cleanString(record.password);

  if (!schoolName) {
    return { error: "School name is required." };
  }

  if (!representativeName) {
    return { error: "Representative name is required." };
  }

  if (!representativeEmail || !isEmail(representativeEmail)) {
    return { error: "A valid representative email is required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  return {
    data: {
      schoolName,
      schoolId: schoolId || undefined,
      schoolType: schoolType || undefined,
      schoolDistrict: schoolDistrict || undefined,
      schoolAddress: schoolAddress || undefined,
      schoolOfferings,
      representativeName,
      representativePosition: representativePosition || undefined,
      representativeEmail,
      contactNumber: contactNumber || undefined,
      password,
    },
  };
}

export function parseRegistrationDecision(body: unknown): {
  data?: RegistrationDecision;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { error: "Request body is required." };
  }

  const record = body as Record<string, unknown>;
  const status = cleanString(record.status).toLowerCase();
  const adminNotes = cleanString(record.adminNotes);

  if (status !== "pending" && status !== "approved" && status !== "rejected") {
    return { error: "Status must be pending, approved, or rejected." };
  }

  return {
    data: {
      status,
      adminNotes: adminNotes || undefined,
    },
  };
}

export async function requirePlatformAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return { error: "Unauthorized" };
  }

  const role = data.claims.app_metadata?.role;

  if (role !== "admin") {
    return { error: "Forbidden" };
  }

  return { userId: data.claims.sub };
}
