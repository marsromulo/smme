"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function FinalApplicationApprovalForm({
  applicationId,
  initialNotes,
}: {
  applicationId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [adminNotes, setAdminNotes] = useState(initialNotes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function approveApplication() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/platform/submissions/${applicationId}/status`, {
        body: JSON.stringify({
          adminNotes,
          status: "approved",
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to approve application.");
      }

      setMessage("Application approved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="platform-final-approval-panel">
      <div>
        <span className="platform-kicker">Final approval</span>
        <h3>Application Notes</h3>
      </div>
      <label>
        <span>Notes</span>
        <textarea
          value={adminNotes}
          onChange={(event) => {
            setAdminNotes(event.target.value);
            setMessage(null);
          }}
        />
      </label>
      <button
        className="platform-btn primary"
        disabled={isSubmitting}
        onClick={() => void approveApplication()}
        type="button"
      >
        <CheckCircle2 aria-hidden="true" size={16} />
        {isSubmitting ? "Approving..." : "Approve"}
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
