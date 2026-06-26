"use client";

import { useState } from "react";

type ReviewStatus = "pending" | "approved" | "rejected" | "resubmit" | "invalid";

export type SubmissionFileHistoryEntry = {
  createdAt: string;
  id: string;
  reviewNote?: string | null;
  reviewStatus: ReviewStatus;
  reviewerName: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function reviewStatusLabel(status: ReviewStatus) {
  if (status === "pending") {
    return "Needs review";
  }

  if (status === "resubmit") {
    return "Resubmit";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function SubmissionFileHistoryPopover({
  fileName,
  history,
}: {
  fileName: string;
  history: SubmissionFileHistoryEntry[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const lastHistory = history[0];

  return (
    <div className="platform-file-review-history-wrap">
      <div className="platform-file-review-history-trigger">
        <span>Last updated by:</span>
        <strong>{lastHistory?.reviewerName ?? "No updates yet"}</strong>
        {history.length > 0 ? (
          <button onClick={() => setIsOpen(true)} type="button">
            Update history
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <div className="platform-history-popover" role="dialog" aria-label={`${fileName} update history`}>
          <div>
            <strong>Update history</strong>
            <button onClick={() => setIsOpen(false)} type="button" aria-label="Close update history">
              x
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{item.reviewerName}</td>
                  <td>{reviewStatusLabel(item.reviewStatus)}</td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
