import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  formatSubmissionStatus,
  getSubmissionList,
  submissionStatusClass,
} from "@/app/platform/submissions-data";

type ServiceRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  sort_order: number;
};

type DocumentRow = {
  service_id: string;
};

async function getSmmeServices() {
  const supabase = createSupabaseAdminClient();
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, code, name, description, status, sort_order")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (servicesError) {
    return { services: [], error: servicesError.message };
  }

  const serviceRows = (services ?? []) as ServiceRow[];
  const serviceIds = serviceRows.map((service) => service.id);
  const { data: documents, error: documentsError } = await supabase
    .from("service_required_documents")
    .select("service_id")
    .in("service_id", serviceIds.length > 0 ? serviceIds : ["00000000-0000-0000-0000-000000000000"]);

  if (documentsError) {
    return { services: [], error: documentsError.message };
  }

  const documentRows = (documents ?? []) as DocumentRow[];

  return {
    services: serviceRows.map((service) => ({
      ...service,
      documentCount: documentRows.filter((document) => document.service_id === service.id).length,
    })),
    error: null,
  };
}

export default async function PlatformApplicationsPage() {
  const session = await getPlatformSession();
  const [{ services, error }, submissions] = await Promise.all([
    getSmmeServices(),
    session.role === "school" ? getSubmissionList(session) : Promise.resolve([]),
  ]);
  const submissionByServiceId = new Map(submissions.map((submission) => [submission.serviceId, submission]));

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <span className="platform-kicker">Applications</span>
          <h1>Applications</h1>
          <p>Browse SMME services available for school submissions.</p>
        </div>
      </section>

      <section className="platform-section">
        <div className="platform-section-head">
          <div>
            <span className="platform-kicker">Service catalog</span>
            <h2>SMME Services</h2>
          </div>
        </div>

        {error ? (
          <p className="platform-empty-state">{error}</p>
        ) : services.length === 0 ? (
          <p className="platform-empty-state">No SMME services available yet.</p>
        ) : (
          <div className="platform-smme-service-list">
            {services.map((service) => {
              const submission = submissionByServiceId.get(service.id);

              return (
                <Link
                  className="platform-smme-service-item"
                  href={`/platform/applications/${service.id}`}
                  key={service.id}
                >
                  <span className="platform-smme-service-icon">
                    <ClipboardList aria-hidden="true" size={21} />
                  </span>
                  <div>
                    <strong>{service.name}</strong>
                    {service.description ? <p>{service.description}</p> : null}
                    <small>
                      {service.documentCount} required document
                      {service.documentCount === 1 ? "" : "s"}
                    </small>
                  </div>
                  <span
                    className={
                      submission
                        ? `platform-smme-service-apply status ${submissionStatusClass(submission.status)}`
                        : "platform-smme-service-apply"
                    }
                  >
                    {submission ? formatSubmissionStatus(submission.status) : "Apply"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
