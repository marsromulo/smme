"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

type RegistrationDecisionFormProps = {
  registrationId: string;
  initialNotes: string;
  currentStatus: "new" | "pending" | "approved" | "rejected";
};

type SubmitState = "idle" | "submitting" | "success" | "error";
type RegistrationStatus = "pending" | "approved" | "rejected";

function formatRegistrationStatus(status: RegistrationStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function RegistrationDecisionForm({
  registrationId,
  initialNotes,
  currentStatus,
}: RegistrationDecisionFormProps) {
  const router = useRouter();
  const [adminNotes, setAdminNotes] = useState(initialNotes);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function submitDecision(status: RegistrationStatus) {
    setSubmitState("submitting");
    setMessage("");

    try {
      const response = await fetch(`/api/platform/school-registrations/${registrationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, adminNotes }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update registration.");
      }

      setSubmitState("success");
      setMessage(`Registration ${formatRegistrationStatus(status)}.`);
      router.refresh();
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "Unable to update registration.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form className="platform-registration-decision" onSubmit={handleSubmit}>
      <label>
        <span>Admin Notes</span>
        <textarea
          placeholder="Add review notes or reason for pending, approval, or rejection"
          rows={5}
          value={adminNotes}
          onChange={(event) => setAdminNotes(event.target.value)}
        />
      </label>

      {message ? (
        <p className={`platform-approval-message ${submitState}`}>{message}</p>
      ) : null}

      <div className="platform-approval-actions detail">
        <button
          type="button"
          onClick={() => submitDecision("pending")}
          disabled={submitState === "submitting" || currentStatus === "pending"}
        >
          <Clock3 aria-hidden="true" size={16} />
          Pending
        </button>
        <button
          type="button"
          onClick={() => submitDecision("approved")}
          disabled={submitState === "submitting" || currentStatus === "approved"}
        >
          <CheckCircle2 aria-hidden="true" size={16} />
          Approve
        </button>
        <button
          type="button"
          onClick={() => submitDecision("rejected")}
          disabled={submitState === "submitting" || currentStatus === "rejected"}
        >
          <XCircle aria-hidden="true" size={16} />
          Reject
        </button>
      </div>
    </form>
  );
}
