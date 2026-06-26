"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubmissionStatusDecisionForm({
  applicationId,
  status,
}: {
  applicationId: string;
  status: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRejected = status === "rejected";

  async function submit(nextStatus: "rejected" | "reopen") {
    if (
      nextStatus === "rejected" &&
      !window.confirm("Reject this application? You can reopen it later, but this action will mark the service as rejected.")
    ) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/platform/submissions/${applicationId}/status`, {
        body: JSON.stringify({ status: nextStatus }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update application status.");
      }

      setMessage(nextStatus === "rejected" ? "Application rejected." : "Application reopened.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update application status.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="platform-submission-decision">
      {isRejected ? (
        <button
          className="platform-btn secondary"
          disabled={isSubmitting}
          onClick={() => void submit("reopen")}
          type="button"
        >
          Reopen
        </button>
      ) : (
        <button
          className="platform-btn danger"
          disabled={isSubmitting}
          onClick={() => void submit("rejected")}
          type="button"
        >
          Reject Application
        </button>
      )}
      {message ? <small>{message}</small> : null}
    </div>
  );
}
