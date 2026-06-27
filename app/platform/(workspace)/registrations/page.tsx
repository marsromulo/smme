import Link from "next/link";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RegistrationRow = {
  id: string;
  school_name: string;
  representative_name: string;
  representative_email: string;
  created_at: string;
  status: string;
};

type RegistrationStatus = "pending" | "approved" | "rejected";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeRegistrationStatus(status: string): RegistrationStatus {
  if (status === "approved" || status === "rejected") {
    return status;
  }

  return "pending";
}

function formatRegistrationStatus(status: RegistrationStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function RegistrationsPage() {
  const session = await getPlatformSession();
  const isAdmin = session.role === "admin";

  if (!isAdmin) {
    return (
      <main className="platform-page">
        <section className="platform-page-head">
          <div>
            <span className="platform-kicker">Restricted</span>
            <h1>Registrations</h1>
            <p>This module is available to administrators only.</p>
          </div>
          <Link className="platform-btn primary" href="/platform">
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("school_registration_requests")
    .select("id, school_name, representative_name, representative_email, created_at, status")
    .order("created_at", { ascending: false });
  const registrations = (data ?? []) as RegistrationRow[];

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <span className="platform-kicker">Admin approval</span>
          <h1>Registrations</h1>
          <p>Review school registration requests submitted from the public registration form.</p>
        </div>
      </section>

      <section className="platform-section">
        <div className="platform-section-head compact">
          <div>
            <span className="platform-kicker">School requests</span>
            <h2>Submitted Registrations</h2>
          </div>
        </div>

        {error ? (
          <p className="platform-empty-state">{error.message}</p>
        ) : registrations.length === 0 ? (
          <p className="platform-empty-state">No registration requests submitted yet.</p>
        ) : (
          <div className="platform-registration-table">
            <div className="platform-registration-table-head">
              <span>School Name</span>
              <span>Contact</span>
              <span>Email</span>
              <span>Date</span>
              <span>Status</span>
            </div>
            <div className="platform-registration-table-body">
              {registrations.map((registration) => {
                const status = normalizeRegistrationStatus(registration.status);

                return (
                  <Link
                    className="platform-registration-table-row"
                    href={`/platform/registrations/${registration.id}`}
                    key={registration.id}
                  >
                    <strong>{registration.school_name}</strong>
                    <span>{registration.representative_name}</span>
                    <span>{registration.representative_email}</span>
                    <time dateTime={registration.created_at}>{formatDate(registration.created_at)}</time>
                    <em className={`platform-pill registration-${status}`}>
                      {formatRegistrationStatus(status)}
                    </em>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
