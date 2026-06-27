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
  const [reopenNote, setReopenNote] = useState("");
  const [isReopenExpanded, setIsReopenExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRejected = status === "rejected";
  const isApproved = status === "approved";
  const isReopenMode = isRejected || isApproved;

  async function submit(nextStatus: "rejected" | "reopen") {
    if (
      nextStatus === "rejected" &&
      !window.confirm("Reject this application? You can reopen it later, but this action will mark the service as rejected.")
    ) {
      return;
    }

    if (nextStatus === "reopen" && !reopenNote.trim()) {
      setMessage("Please add a reopening note.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/platform/submissions/${applicationId}/status`, {
        body: JSON.stringify({
          adminNotes: nextStatus === "reopen" ? reopenNote : undefined,
          status: nextStatus,
        }),
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
      {isReopenMode && !isReopenExpanded ? (
        <button
          className="platform-btn primary"
          disabled={isSubmitting}
          onClick={() => {
            setIsReopenExpanded(true);
            setMessage(null);
          }}
          type="button"
        >
          Reopen Application
        </button>
      ) : isReopenMode ? (
        <>
          <label className="platform-submission-reopen-note">
            <span>Reopen Note</span>
            <textarea
              onChange={(event) => setReopenNote(event.target.value)}
              rows={2}
              value={reopenNote}
            />
          </label>
          <div className="platform-submission-reopen-actions">
            <button
              className="platform-btn secondary"
              disabled={isSubmitting}
              onClick={() => {
                setIsReopenExpanded(false);
                setReopenNote("");
                setMessage(null);
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="platform-btn primary"
              disabled={isSubmitting}
              onClick={() => void submit("reopen")}
              type="button"
            >
              Reopen Application
            </button>
          </div>
        </>
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
