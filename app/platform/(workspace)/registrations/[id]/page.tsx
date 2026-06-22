import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Building2, Mail, Phone, UserRound } from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RegistrationDecisionForm } from "../../../components/RegistrationDecisionForm";

type RegistrationDetail = {
  id: string;
  school_name: string;
  school_id: string | null;
  school_type: string | null;
  school_district: string | null;
  school_address: string | null;
  school_offerings: string[] | null;
  representative_name: string;
  representative_position: string | null;
  representative_email: string;
  contact_number: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not reviewed";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPlatformSession();
  const isAdmin = session.role === "admin";

  if (!isAdmin) {
    return (
      <main className="platform-page">
        <section className="platform-page-head">
          <div>
            <span className="platform-kicker">Restricted</span>
            <h1>Registration Details</h1>
            <p>This module is available to administrators only.</p>
          </div>
          <Link className="platform-btn primary" href="/platform">
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("school_registration_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const registration = data as RegistrationDetail;

  return (
    <main className="platform-page">
      <section className="platform-page-head registration-review">
        <div className="platform-registration-review-title">
          <Link className="platform-back-link" href="/platform/registrations">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to Registrations
          </Link>
          <span className="platform-kicker">Registration review</span>
          <h1>{registration.school_name}</h1>
          <p>Review the submitted school registration request and set its approval status.</p>
        </div>
        <span className={`platform-pill registration-${registration.status}`}>
          {registration.status}
        </span>
      </section>

      <section className="platform-grid detail">
        <article className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">School profile</span>
              <h2>Submitted Details</h2>
            </div>
          </div>

          <div className="platform-registration-detail-list">
            <div>
              <Building2 aria-hidden="true" size={18} />
              <span>School Name</span>
              <strong>{registration.school_name}</strong>
            </div>
            <div>
              <Building2 aria-hidden="true" size={18} />
              <span>School Type</span>
              <strong>{registration.school_type ?? "Not provided"}</strong>
            </div>
            <div>
              <Building2 aria-hidden="true" size={18} />
              <span>District</span>
              <strong>{registration.school_district ?? "Not provided"}</strong>
            </div>
            <div>
              <Building2 aria-hidden="true" size={18} />
              <span>School Address</span>
              <strong>{registration.school_address ?? "Not provided"}</strong>
            </div>
            <div>
              <BookOpenCheck aria-hidden="true" size={18} />
              <span>Offerings &amp; Services</span>
              <strong>
                {registration.school_offerings?.length
                  ? registration.school_offerings.join(", ")
                  : "Not provided"}
              </strong>
            </div>
            <div>
              <UserRound aria-hidden="true" size={18} />
              <span>Contact Person</span>
              <strong>{registration.representative_name}</strong>
            </div>
            <div>
              <UserRound aria-hidden="true" size={18} />
              <span>Position</span>
              <strong>{registration.representative_position ?? "Not provided"}</strong>
            </div>
            <div>
              <Mail aria-hidden="true" size={18} />
              <span>Email</span>
              <strong>{registration.representative_email}</strong>
            </div>
            <div>
              <Phone aria-hidden="true" size={18} />
              <span>Contact Number</span>
              <strong>{registration.contact_number ?? "Not provided"}</strong>
            </div>
          </div>
        </article>

        <aside className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Admin action</span>
              <h2>Review Status</h2>
            </div>
          </div>

          <div className="platform-review-status registration">
            <div>
              <span>Submitted</span>
              <strong>{formatDateTime(registration.created_at)}</strong>
            </div>
            <div>
              <span>Last Reviewed</span>
              <strong>{formatDateTime(registration.reviewed_at)}</strong>
            </div>
          </div>

          <RegistrationDecisionForm
            registrationId={registration.id}
            currentStatus={registration.status}
            initialNotes={registration.admin_notes ?? ""}
          />
        </aside>
      </section>
    </main>
  );
}
