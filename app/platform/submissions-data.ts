import { notFound } from "next/navigation";
import type { PlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ApplicationRow = {
  admin_notes: string | null;
  created_at: string;
  id: string;
  school_id: string | null;
  school_user_id: string;
  service_id: string;
  status: string;
  submitted_at: string;
};

export type SubmissionFileRow = {
  application_id: string;
  created_at: string;
  id: string;
  mime_type: string;
  original_name: string;
  review_note: string | null;
  review_status: string;
  reviewed_at: string | null;
  service_required_document_id: string | null;
  size_bytes: number;
  upload_status: string;
  uploaded_at: string | null;
};

export type SubmissionRequiredDocument = {
  id: string;
  name: string;
  sort_order: number;
};

type ServiceRow = {
  code: string;
  id: string;
  name: string;
};

type SchoolRow = {
  id: string;
  school_name: string;
  slug: string | null;
};

export type SubmissionListItem = {
  fileCount: number;
  id: string;
  schoolName: string;
  schoolSlug: string | null;
  schoolUserId: string;
  serviceCode: string;
  serviceId: string;
  serviceName: string;
  status: string;
  submittedAt: string;
  uploadedFileCount: number;
};

export type SubmissionDetail = SubmissionListItem & {
  adminNotes: string | null;
  files: SubmissionFileRow[];
  requiredDocuments: SubmissionRequiredDocument[];
};

export function formatSubmissionDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatSubmissionStatus(value: string) {
  const normalizedValue = normalizeSubmissionStatus(value);

  if (normalizedValue === "in_progress") {
    return "In progress";
  }

  return normalizedValue
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function statusClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
}

export function submissionStatusClass(value: string) {
  return `platform-pill ${statusClass(normalizeSubmissionStatus(value))}`;
}

function normalizeSubmissionStatus(value: string) {
  if (value === "approved") {
    return "approved";
  }

  if (value === "rejected" || value === "returned") {
    return "rejected";
  }

  return "in_progress";
}

function getServiceMap(services: ServiceRow[]) {
  return new Map(services.map((service) => [service.id, service]));
}

function getSchoolMap(schools: SchoolRow[]) {
  return new Map(schools.map((school) => [school.id, school]));
}

async function getRelatedRows(applications: ApplicationRow[]) {
  const supabase = createSupabaseAdminClient();
  const serviceIds = Array.from(new Set(applications.map((application) => application.service_id)));
  const schoolIds = Array.from(
    new Set(applications.map((application) => application.school_id).filter(Boolean) as string[]),
  );
  const applicationIds = applications.map((application) => application.id);

  const [{ data: services }, { data: schools }, { data: files }, { data: requiredDocuments }] = await Promise.all([
    supabase
      .from("services")
      .select("id, code, name")
      .in("id", serviceIds.length > 0 ? serviceIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("schools")
      .select("id, school_name, slug")
      .in("id", schoolIds.length > 0 ? schoolIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("service_application_files")
      .select("id, application_id, service_required_document_id, original_name, mime_type, size_bytes, upload_status, review_status, review_note, reviewed_at, uploaded_at, created_at")
      .in("application_id", applicationIds.length > 0 ? applicationIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: true }),
    supabase
      .from("service_required_documents")
      .select("id, name, sort_order")
      .in("service_id", serviceIds.length > 0 ? serviceIds : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  return {
    files: (files ?? []) as SubmissionFileRow[],
    requiredDocuments: (requiredDocuments ?? []) as SubmissionRequiredDocument[],
    schools: (schools ?? []) as SchoolRow[],
    services: (services ?? []) as ServiceRow[],
  };
}

function mapApplication({
  application,
  files,
  schools,
  services,
}: {
  application: ApplicationRow;
  files: SubmissionFileRow[];
  schools: Map<string, SchoolRow>;
  services: Map<string, ServiceRow>;
}): SubmissionListItem {
  const service = services.get(application.service_id);
  const applicationFiles = files.filter((file) => file.application_id === application.id);

  return {
    fileCount: applicationFiles.length,
    id: application.id,
    schoolName: application.school_id
      ? schools.get(application.school_id)?.school_name ?? "School account"
      : "School account",
    schoolSlug: application.school_id ? schools.get(application.school_id)?.slug ?? null : null,
    schoolUserId: application.school_user_id,
    serviceCode: service?.code ?? "SERVICE",
    serviceId: application.service_id,
    serviceName: service?.name ?? "Service application",
    status: normalizeSubmissionStatus(application.status),
    submittedAt: application.submitted_at,
    uploadedFileCount: applicationFiles.filter((file) => file.upload_status === "uploaded").length,
  };
}

function groupSubmissions(items: SubmissionListItem[], getKey: (item: SubmissionListItem) => string) {
  const groups = new Map<string, SubmissionListItem>();

  for (const item of items) {
    const current = groups.get(getKey(item));

    if (!current) {
      groups.set(getKey(item), {
        ...item,
        fileCount: item.uploadedFileCount,
        uploadedFileCount: item.uploadedFileCount,
      });
      continue;
    }

    const latestItem = new Date(item.submittedAt).getTime() > new Date(current.submittedAt).getTime()
      ? item
      : current;

    groups.set(getKey(item), {
      ...latestItem,
      fileCount: current.fileCount + item.uploadedFileCount,
      uploadedFileCount: current.uploadedFileCount + item.uploadedFileCount,
    });
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

export async function getSubmissionList(session: PlatformSession): Promise<SubmissionListItem[]> {
  if (!session.userId) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("service_applications")
    .select("id, school_user_id, school_id, service_id, status, submitted_at, admin_notes, created_at")
    .order("submitted_at", { ascending: false });

  if (session.role === "school") {
    query = query.eq("school_user_id", session.userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Unable to load service submissions:", error.message);
    return [];
  }

  const applications = (data ?? []) as ApplicationRow[];

  if (applications.length === 0) {
    return [];
  }

  const related = await getRelatedRows(applications);
  const serviceMap = getServiceMap(related.services);
  const schoolMap = getSchoolMap(related.schools);

  const mappedApplications = applications.map((application) =>
    mapApplication({
      application,
      files: related.files,
      schools: schoolMap,
      services: serviceMap,
    }),
  );

  if (session.role === "school") {
    return groupSubmissions(mappedApplications, (item) => item.serviceId);
  }

  return groupSubmissions(mappedApplications, (item) => `${item.schoolUserId}:${item.serviceId}`);
}

export async function getSubmissionDetail({
  applicationId,
  session,
}: {
  applicationId: string;
  session: PlatformSession;
}): Promise<SubmissionDetail> {
  if (!session.userId) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("service_applications")
    .select("id, school_user_id, school_id, service_id, status, submitted_at, admin_notes, created_at")
    .eq("id", applicationId)
    .single();

  if (error || !data) {
    notFound();
  }

  const application = data as ApplicationRow;

  if (session.role === "school" && application.school_user_id !== session.userId) {
    notFound();
  }

  let detailApplications = [application];
  const { data: serviceApplications, error: serviceApplicationsError } = await supabase
    .from("service_applications")
    .select("id, school_user_id, school_id, service_id, status, submitted_at, admin_notes, created_at")
    .eq("school_user_id", application.school_user_id)
    .eq("service_id", application.service_id)
    .order("submitted_at", { ascending: false });

  if (serviceApplicationsError) {
    console.error("Unable to load grouped service submissions:", serviceApplicationsError.message);
  } else {
    detailApplications = (serviceApplications ?? []) as ApplicationRow[];
  }

  const related = await getRelatedRows(detailApplications);
  const mappedApplications = detailApplications.map((detailApplication) =>
    mapApplication({
      application: detailApplication,
      files: related.files,
      schools: getSchoolMap(related.schools),
      services: getServiceMap(related.services),
    }),
  );
  const listItem =
    session.role === "school"
      ? groupSubmissions(mappedApplications, (item) => item.serviceId)[0]
      : groupSubmissions(mappedApplications, (item) => `${item.schoolUserId}:${item.serviceId}`)[0];

  if (!listItem) {
    notFound();
  }

  return {
    ...listItem,
    adminNotes: application.admin_notes,
    files: related.files.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
    requiredDocuments: related.requiredDocuments,
  };
}
