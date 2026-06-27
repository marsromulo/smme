"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";

type Registration = {
  id: string;
  school_name: string;
  school_id: string | null;
  representative_name: string;
  representative_email: string;
  contact_number: string | null;
  status: string;
  created_at: string;
};

type RegistrationStatus = "pending" | "approved" | "rejected";

type LoadState = "idle" | "loading" | "ready" | "error";

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

export function AdminRegistrationApprovals() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");

  const loadRegistrations = useCallback(async () => {
    setLoadState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/platform/school-registrations");
      const result = (await response.json()) as {
        registrations?: Registration[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load registration requests.");
      }

      setRegistrations(result.registrations ?? []);
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setMessage(error instanceof Error ? error.message : "Unable to load registration requests.");
    }
  }, []);

  async function updateRegistration(id: string, status: RegistrationStatus) {
    setMessage("");

    try {
      const response = await fetch(`/api/platform/school-registrations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update registration request.");
      }

      setRegistrations((current) =>
        current.map((registration) =>
          registration.id === id ? { ...registration, status } : registration,
        ),
      );
      setMessage(`Registration ${formatRegistrationStatus(status)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update registration request.");
    }
  }

  return (
    <section className="platform-section platform-registration-approvals">
      <div className="platform-section-head">
        <div>
          <span className="platform-kicker">Admin approval</span>
          <h2>School Registration Requests</h2>
        </div>
        <button className="platform-filter-button" type="button" onClick={loadRegistrations}>
          <RefreshCw aria-hidden="true" size={17} />
          Refresh
        </button>
      </div>

      {message ? <p className="platform-approval-message">{message}</p> : null}

      {loadState === "loading" ? (
        <p className="platform-empty-state">Loading registration requests...</p>
      ) : loadState === "idle" ? (
        <p className="platform-empty-state">Click Refresh to load school registration requests.</p>
      ) : registrations.length === 0 ? (
        <p className="platform-empty-state">No school registration requests yet.</p>
      ) : (
        <div className="platform-approval-list">
          {registrations.map((registration) => {
            const status = normalizeRegistrationStatus(registration.status);

            return (
              <article className="platform-approval-row" key={registration.id}>
                <div>
                  <strong>{registration.school_name}</strong>
                  <span>
                    {registration.school_id || "No school ID"} · {registration.representative_name}
                  </span>
                  <small>
                    {registration.representative_email}
                    {registration.contact_number ? ` · ${registration.contact_number}` : ""} · Submitted{" "}
                    {formatDate(registration.created_at)}
                  </small>
                </div>
                <span className={`platform-pill registration-${status}`}>
                  {status === "approved" ? (
                    <CheckCircle2 aria-hidden="true" size={15} />
                  ) : status === "rejected" ? (
                    <XCircle aria-hidden="true" size={15} />
                  ) : (
                    <Clock3 aria-hidden="true" size={15} />
                  )}
                  {formatRegistrationStatus(status)}
                </span>
                <div className="platform-approval-actions">
                  <button
                    type="button"
                    onClick={() => updateRegistration(registration.id, "approved")}
                    disabled={status === "approved"}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRegistration(registration.id, "rejected")}
                    disabled={status === "rejected"}
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
