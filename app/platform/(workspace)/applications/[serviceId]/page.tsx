import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileUp, ListChecks } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ServiceApplicationUploader } from "@/app/platform/components/ServiceApplicationUploader";

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

async function getServiceApplication(serviceId: string) {
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

  return {
    documents: (documents ?? []) as RequiredDocument[],
    service: service as ServiceDetail,
  };
}

export default async function ServiceApplicationPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const application = await getServiceApplication(serviceId);

  if (!application) {
    notFound();
  }

  const { service, documents } = application;

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <Link className="platform-back-link" href="/platform/applications">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to Applications
          </Link>
          <span className="platform-kicker">SMME service application</span>
          <h1>{service.name}</h1>
          {service.description ? <p>{service.description}</p> : null}
        </div>
      </section>

      <section className="platform-application-intake-grid">
        <article className="platform-section platform-application-upload-panel">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Upload package</span>
              <h2>Application Documents</h2>
            </div>
            <FileUp aria-hidden="true" size={24} />
          </div>

          <ServiceApplicationUploader serviceId={service.id} />
        </article>

        <aside className="platform-section platform-required-documents-summary">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Checklist</span>
              <h2>Required Documents ({documents.length})</h2>
            </div>
            <ListChecks aria-hidden="true" size={24} />
          </div>

          {documents.length === 0 ? (
            <p className="platform-empty-state">No required documents configured for this service.</p>
          ) : (
            <ol className="platform-service-required-list">
              {documents.map((document, index) => (
                <li key={document.id}>
                  <span>{index + 1}</span>
                  <strong>{document.name}</strong>
                  <CheckCircle2 aria-hidden="true" size={16} />
                </li>
              ))}
            </ol>
          )}
        </aside>
      </section>
    </main>
  );
}
