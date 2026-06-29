import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MailCheck } from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SchoolServiceApplicationIntake } from "@/app/platform/components/SchoolServiceApplicationIntake";

type ServiceDetail = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
};

type RequiredDocument = {
  id: string;
  name: string;
  sort_order: number;
};

type ExistingApplicationFile = {
  id: string;
  name: string;
  serviceRequiredDocumentId: string | null;
  size: number;
  type: string;
};

async function getServiceApplication({
  serviceId,
  userId,
}: {
  serviceId: string;
  userId: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, code, name, description, status")
    .eq("id", serviceId)
    .eq("status", "active")
    .single();

  if (serviceError || !service) {
    return null;
  }

  const { data: documents, error: documentsError } = await supabase
    .from("service_required_documents")
    .select("id, name, sort_order")
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (documentsError) {
    throw new Error(documentsError.message);
  }

  let applicationId: string | null = null;
  let existingFiles: ExistingApplicationFile[] = [];

  if (userId) {
    const { data: applications, error: applicationsError } = await supabase
      .from("service_applications")
      .select("id, submitted_at, created_at")
      .eq("service_id", serviceId)
      .eq("school_user_id", userId)
      .order("submitted_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (applicationsError) {
      throw new Error(applicationsError.message);
    }

    const applicationIds = (applications ?? []).map((application) => application.id);
    applicationId = applicationIds[0] ?? null;

    if (applicationIds.length > 0) {
      const { data: files, error: filesError } = await supabase
        .from("service_application_files")
        .select("id, original_name, service_required_document_id, mime_type, size_bytes, review_status")
        .eq("upload_status", "uploaded")
        .neq("review_status", "invalid")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: true });

      if (filesError) {
        throw new Error(filesError.message);
      }

      existingFiles = (files ?? []).map((file) => ({
        id: file.id,
        name: file.original_name,
        serviceRequiredDocumentId: file.service_required_document_id,
        size: file.size_bytes,
        type: file.mime_type,
      }));
    }
  }

  return {
    applicationId,
    documents: (documents ?? []) as RequiredDocument[],
    existingFiles,
    service: service as ServiceDetail,
  };
}

export default async function ServiceApplicationPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const session = await getPlatformSession();
  const application = await getServiceApplication({ serviceId, userId: session.userId });

  if (!application) {
    notFound();
  }

  const { applicationId, service, documents, existingFiles } = application;

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div className="platform-application-title-stack">
          <Link className="platform-back-link" href="/platform/applications">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to Applications
          </Link>
          <span className="platform-kicker">SMME service application</span>
          <h1>{service.name}</h1>
          {service.description ? <p>{service.description}</p> : null}
        </div>
      </section>

      <section className="platform-section platform-application-instructions">
        <div className="platform-section-head compact">
          <div>
            <span className="platform-kicker">Before you upload</span>
            <h2>Document Submission Instructions</h2>
          </div>
          <MailCheck aria-hidden="true" size={24} />
        </div>
        <p>
          Start by reviewing the required documents listed below, then upload the files that match
          each requirement for this service. The SMME admin will validate every submitted document
          and mark it as approved, for resubmission, or rejected.
        </p>
        <p>
          Please check your dashboard regularly for updates. You should also monitor your registered
          email address for admin notifications about your application status and document review
          results.
        </p>
      </section>

      <SchoolServiceApplicationIntake
        applicationId={applicationId}
        documents={documents}
        initialFiles={existingFiles}
        serviceId={service.id}
      />
    </main>
  );
}
