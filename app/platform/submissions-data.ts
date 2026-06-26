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

export type SubmissionStatus = "new" | "in_progress" | "approved" | "rejected";
export type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit" | "invalid";
export type RequiredDocumentStatus =
  | "not_assigned"
  | "assigned"
  | "needs_review"
  | "resubmit"
  | "rejected"
  | "approved";

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
  review_history: SubmissionFileReviewHistory[];
};

export type SubmissionRequiredDocument = {
  id: string;
  name: string;
  service_id: string;
  sort_order: number;
};

export type SubmissionFileReviewHistory = {
  created_at: string;
  id: string;
  review_note: string | null;
  review_status: string;
  reviewer_name: string;
  service_application_file_id: string;
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

  if (normalizedValue === "new") {
    return "New";
  }

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

export function normalizeSubmissionStatus(value: string): SubmissionStatus {
  if (value === "new") {
    return "new";
  }

  if (value === "approved") {
    return "approved";
  }

  if (value === "rejected" || value === "returned") {
    return "rejected";
  }

  return "in_progress";
}

export function normalizeReviewStatus(value: string): ReviewStatus {
  if (value === "approved" || value === "rejected" || value === "resubmit" || value === "invalid") {
    return value;
  }

  return "pending";
}

export function requiredDocumentStatusLabel(status: RequiredDocumentStatus) {
  if (status === "not_assigned") {
    return "Not Assigned";
  }

  if (status === "needs_review") {
    return "Needs review";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function requiredDocumentStatusClass(status: RequiredDocumentStatus) {
  return `platform-pill ${statusClass(status)}`;
}

export function getRequiredDocumentStatus({
  files,
  requiredDocumentId,
}: {
  files: SubmissionFileRow[];
  requiredDocumentId: string;
}): RequiredDocumentStatus {
  const assignedFiles = files.filter(
    (file) =>
      file.upload_status === "uploaded" &&
      file.service_required_document_id === requiredDocumentId,
  );
  const activeFiles = assignedFiles.filter((file) => normalizeReviewStatus(file.review_status) !== "invalid");

  if (activeFiles.length === 0) {
    return "not_assigned";
  }

  if (activeFiles.every((file) => normalizeReviewStatus(file.review_status) === "approved")) {
    return "approved";
  }

  if (activeFiles.some((file) => normalizeReviewStatus(file.review_status) === "rejected")) {
    return "rejected";
  }

  if (activeFiles.some((file) => normalizeReviewStatus(file.review_status) === "resubmit")) {
    return "resubmit";
  }

  if (
    activeFiles.some(
      (file) =>
        normalizeReviewStatus(file.review_status) === "pending" &&
        (file.reviewed_at || file.review_history.length > 0),
    )
  ) {
    return "needs_review";
  }

  return "assigned";
}

export function deriveSubmissionStatus({
  files,
  requiredDocuments,
  storedStatuses,
}: {
  files: SubmissionFileRow[];
  requiredDocuments: SubmissionRequiredDocument[];
  storedStatuses: string[];
}): SubmissionStatus {
  if (storedStatuses.some((status) => normalizeSubmissionStatus(status) === "rejected")) {
    return "rejected";
  }

  const uploadedFiles = files.filter((file) => file.upload_status === "uploaded");
  const activeUploadedFiles = uploadedFiles.filter(
    (file) => normalizeReviewStatus(file.review_status) !== "invalid",
  );
  const requiredDocumentStatuses = requiredDocuments.map((document) =>
    getRequiredDocumentStatus({
      files: activeUploadedFiles,
      requiredDocumentId: document.id,
    }),
  );

  if (
    requiredDocumentStatuses.length > 0 &&
    requiredDocumentStatuses.every((status) => status === "approved")
  ) {
    return "approved";
  }

  if (activeUploadedFiles.some((file) => Boolean(file.service_required_document_id))) {
    return "in_progress";
  }

  return "new";
}

function latestTimestamp(values: string[]) {
  return values.reduce((latest, value) => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time > latest ? time : latest;
  }, 0);
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
      .select("id, service_id, name, sort_order")
      .in("service_id", serviceIds.length > 0 ? serviceIds : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const fileRows = (files ?? []) as Omit<SubmissionFileRow, "review_history">[];
  const fileIds = fileRows.map((file) => file.id);
  const { data: reviewHistory } = await supabase
    .from("service_application_file_review_history")
    .select("id, service_application_file_id, reviewer_name, review_status, review_note, created_at")
    .in("service_application_file_id", fileIds.length > 0 ? fileIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });
  const historyRows = (reviewHistory ?? []) as SubmissionFileReviewHistory[];

  return {
    files: fileRows.map((file) => ({
      ...file,
      review_history: historyRows.filter((history) => history.service_application_file_id === file.id),
    })),
    requiredDocuments: (requiredDocuments ?? []) as SubmissionRequiredDocument[],
    schools: (schools ?? []) as SchoolRow[],
    services: (services ?? []) as ServiceRow[],
  };
}

function buildSubmissionListItem({
  applications,
  files,
  requiredDocuments,
  schools,
  services,
}: {
  applications: ApplicationRow[];
  files: SubmissionFileRow[];
  requiredDocuments: SubmissionRequiredDocument[];
  schools: Map<string, SchoolRow>;
  services: Map<string, ServiceRow>;
}): SubmissionListItem {
  const applicationIds = new Set(applications.map((application) => application.id));
  const groupFiles = files.filter((file) => applicationIds.has(file.application_id));
  const uploadedFiles = groupFiles.filter((file) => file.upload_status === "uploaded");
  const latestApplication = applications.reduce((latest, application) => {
    const latestTime = latestTimestamp([
      latest.submitted_at,
      latest.created_at,
      ...groupFiles
        .filter((file) => file.application_id === latest.id)
        .map((file) => file.uploaded_at ?? file.created_at),
    ]);
    const applicationTime = latestTimestamp([
      application.submitted_at,
      application.created_at,
      ...groupFiles
        .filter((file) => file.application_id === application.id)
        .map((file) => file.uploaded_at ?? file.created_at),
    ]);

    return applicationTime > latestTime ? application : latest;
  }, applications[0]);
  const service = services.get(latestApplication.service_id);
  const serviceRequiredDocuments = requiredDocuments.filter(
    (document) => document.service_id === latestApplication.service_id,
  );
  const submittedAt = new Date(
    latestTimestamp([
      latestApplication.submitted_at,
      latestApplication.created_at,
      ...groupFiles.map((file) => file.uploaded_at ?? file.created_at),
    ]),
  ).toISOString();

  return {
    fileCount: uploadedFiles.length,
    id: latestApplication.id,
    schoolName: latestApplication.school_id
      ? schools.get(latestApplication.school_id)?.school_name ?? "School account"
      : "School account",
    schoolSlug: latestApplication.school_id ? schools.get(latestApplication.school_id)?.slug ?? null : null,
    schoolUserId: latestApplication.school_user_id,
    serviceCode: service?.code ?? "SERVICE",
    serviceId: latestApplication.service_id,
    serviceName: service?.name ?? "Service application",
    status: deriveSubmissionStatus({
      files: groupFiles,
      requiredDocuments: serviceRequiredDocuments,
      storedStatuses: applications.map((application) => application.status),
    }),
    submittedAt,
    uploadedFileCount: uploadedFiles.length,
  };
}

function groupApplications(
  applications: ApplicationRow[],
  getKey: (application: ApplicationRow) => string,
) {
  const groups = new Map<string, ApplicationRow[]>();

  for (const application of applications) {
    const key = getKey(application);
    groups.set(key, [...(groups.get(key) ?? []), application]);
  }

  return Array.from(groups.values());
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

  const groupedApplications =
    session.role === "school"
      ? groupApplications(applications, (application) => application.service_id)
      : groupApplications(applications, (application) => `${application.school_user_id}:${application.service_id}`);

  return groupedApplications
    .map((applicationGroup) =>
      buildSubmissionListItem({
        applications: applicationGroup,
        files: related.files,
        requiredDocuments: related.requiredDocuments,
        schools: schoolMap,
        services: serviceMap,
      }),
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
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
  const listItem = buildSubmissionListItem({
    applications: detailApplications,
    files: related.files,
    requiredDocuments: related.requiredDocuments,
    schools: getSchoolMap(related.schools),
    services: getServiceMap(related.services),
  });

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
