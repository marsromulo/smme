"use client";

import { type CSSProperties, useState } from "react";
import { Check, CheckCircle2, FileText, FileUp, ListChecks } from "lucide-react";
import {
  ServiceApplicationUploader,
  type UploadedApplicationFileAssignment,
} from "@/app/platform/components/ServiceApplicationUploader";

type RequiredDocument = {
  id: string;
  name: string;
};

type TransferAnimation = {
  fromX: number;
  fromY: number;
  id: number;
  toX: number;
  toY: number;
};

const deleteFileSelectValue = "__delete_file__";

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Request failed.";
    throw new Error(message);
  }

  return data;
}

export function SchoolServiceApplicationIntake({
  applicationId,
  documents,
  initialFiles = [],
  serviceId,
}: {
  applicationId: string | null;
  documents: RequiredDocument[];
  initialFiles?: UploadedApplicationFileAssignment[];
  serviceId: string;
}) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedApplicationFileAssignment[]>(initialFiles);
  const [assignmentValues, setAssignmentValues] = useState<Record<string, string | null>>(
    Object.fromEntries(initialFiles.map((file) => [file.id, file.serviceRequiredDocumentId ?? ""])),
  );
  const [expandedRequirementId, setExpandedRequirementId] = useState<string | null>(null);
  const [savingAssignmentIds, setSavingAssignmentIds] = useState<Record<string, boolean>>({});
  const [assignmentMessages, setAssignmentMessages] = useState<Record<string, string>>({});
  const [assignmentErrors, setAssignmentErrors] = useState<Record<string, string>>({});
  const [transferAnimation, setTransferAnimation] = useState<TransferAnimation | null>(null);

  function handleUploadedFilesReady(files: UploadedApplicationFileAssignment[]) {
    setUploadedFiles((currentFiles) => {
      const nextFiles = [...currentFiles];

      for (const file of files) {
        const existingIndex = nextFiles.findIndex((currentFile) => currentFile.id === file.id);

        if (existingIndex >= 0) {
          nextFiles[existingIndex] = file;
        } else {
          nextFiles.push(file);
        }
      }

      return nextFiles;
    });
    setAssignmentValues((current) => ({
      ...current,
      ...Object.fromEntries(files.map((file) => [file.id, file.serviceRequiredDocumentId ?? ""])),
    }));
    setAssignmentMessages({});
    setAssignmentErrors({});
  }

  function handleAssignmentSaved(
    file: UploadedApplicationFileAssignment,
    serviceRequiredDocumentId: string,
  ) {
    setUploadedFiles((currentFiles) => {
      const nextFile = { ...file, serviceRequiredDocumentId };
      const existingFile = currentFiles.some((currentFile) => currentFile.id === file.id);

      return existingFile
        ? currentFiles.map((currentFile) => (currentFile.id === file.id ? nextFile : currentFile))
        : [...currentFiles, nextFile];
    });
    setAssignmentValues((current) => ({ ...current, [file.id]: serviceRequiredDocumentId }));
    setExpandedRequirementId(serviceRequiredDocumentId);
  }

  function triggerAssignmentAnimation(sourceElement: HTMLElement, serviceRequiredDocumentId: string) {
    const targetElement = document.querySelector<HTMLElement>(
      `[data-required-document-id="${serviceRequiredDocumentId}"]`,
    );

    if (!targetElement) {
      return;
    }

    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    setTransferAnimation({
      fromX: sourceRect.left + sourceRect.width / 2,
      fromY: sourceRect.top + sourceRect.height / 2,
      id: Date.now(),
      toX: targetRect.left + Math.min(34, targetRect.width / 2),
      toY: targetRect.top + targetRect.height / 2,
    });

    window.setTimeout(() => setTransferAnimation(null), 820);
  }

  async function saveAssignment(file: UploadedApplicationFileAssignment, sourceElement: HTMLElement) {
    const nextRequiredDocumentId = assignmentValues[file.id] ?? file.serviceRequiredDocumentId ?? "";

    if (!nextRequiredDocumentId || savingAssignmentIds[file.id]) {
      return;
    }

    setSavingAssignmentIds((current) => ({ ...current, [file.id]: true }));
    setAssignmentErrors((current) => ({ ...current, [file.id]: "" }));
    setAssignmentMessages((current) => ({ ...current, [file.id]: "" }));

    try {
      if (nextRequiredDocumentId === deleteFileSelectValue) {
        const response = await fetch(`/api/platform/application-files/${file.id}/assign`, {
          method: "DELETE",
        });

        await readJson<{ error?: string; ok: boolean }>(response);
        setUploadedFiles((currentFiles) => currentFiles.filter((currentFile) => currentFile.id !== file.id));
        setAssignmentValues((current) => {
          const nextValues = { ...current };
          delete nextValues[file.id];
          return nextValues;
        });
        return;
      }

      const response = await fetch(`/api/platform/application-files/${file.id}/assign`, {
        body: JSON.stringify({ serviceRequiredDocumentId: nextRequiredDocumentId }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = await readJson<{
        file?: {
          id: string;
          originalName: string;
          serviceRequiredDocumentId: string | null;
          size: number;
          type: string;
        };
        error?: string;
      }>(response);
      const updatedFile = {
        ...file,
        name: result.file?.originalName ?? file.name,
        serviceRequiredDocumentId: result.file?.serviceRequiredDocumentId ?? nextRequiredDocumentId,
        size: result.file?.size ?? file.size,
        type: result.file?.type ?? file.type,
      };

      triggerAssignmentAnimation(sourceElement, nextRequiredDocumentId);
      setUploadedFiles((currentFiles) =>
        currentFiles.map((currentFile) => (currentFile.id === file.id ? updatedFile : currentFile)),
      );
      setAssignmentValues((current) => ({ ...current, [file.id]: nextRequiredDocumentId }));
      setExpandedRequirementId(nextRequiredDocumentId);
      setAssignmentMessages((current) => ({ ...current, [file.id]: "Assigned." }));
    } catch (assignmentError) {
      setAssignmentErrors((current) => ({
        ...current,
        [file.id]: assignmentError instanceof Error ? assignmentError.message : "Unable to assign document.",
      }));
    } finally {
      setSavingAssignmentIds((current) => ({ ...current, [file.id]: false }));
    }
  }

  return (
    <section className="platform-application-intake-grid">
      {transferAnimation ? (
        <span
          aria-hidden="true"
          className="platform-assignment-transfer-orb"
          key={transferAnimation.id}
          style={
            {
              "--transfer-from-x": `${transferAnimation.fromX}px`,
              "--transfer-from-y": `${transferAnimation.fromY}px`,
              "--transfer-to-x": `${transferAnimation.toX}px`,
              "--transfer-to-y": `${transferAnimation.toY}px`,
            } as CSSProperties
          }
        />
      ) : null}

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
          <ol className="platform-service-required-list platform-service-required-list-assignable">
            {documents.map((document, index) => {
              const assignedFiles = uploadedFiles.filter(
                (file) => file.serviceRequiredDocumentId === document.id,
              );
              const isExpanded = expandedRequirementId === document.id;

              return (
                <li
                  className={isExpanded ? "expanded" : undefined}
                  data-required-document-id={document.id}
                  key={document.id}
                >
                  <button
                    className="platform-service-required-row"
                    onClick={() => setExpandedRequirementId(isExpanded ? null : document.id)}
                    type="button"
                  >
                    <span>{index + 1}</span>
                    <strong>{document.name}</strong>
                    <em>{assignedFiles.length}</em>
                    <CheckCircle2 aria-hidden="true" size={16} />
                  </button>

                  {isExpanded ? (
                    <div className="platform-service-required-assigned-files">
                      {assignedFiles.length === 0 ? (
                        <p>No uploaded files assigned yet.</p>
                      ) : (
                        assignedFiles.map((file) => {
                          const assignmentValue = assignmentValues[file.id] ?? file.serviceRequiredDocumentId ?? "";

                          return (
                            <article className="platform-required-assigned-file" key={file.id}>
                              <div>
                                <FileText aria-hidden="true" size={16} />
                                <span>
                                  <strong>{file.name}</strong>
                                  <small>{formatFileSize(file.size)}</small>
                                </span>
                              </div>
                              <div className="platform-uploaded-file-assignment">
                                <label>
                                  <span>Assign</span>
                                  <select
                                    onChange={(event) => {
                                      setAssignmentValues((current) => ({
                                        ...current,
                                        [file.id]: event.target.value,
                                      }));
                                      setAssignmentMessages((current) => ({ ...current, [file.id]: "" }));
                                      setAssignmentErrors((current) => ({ ...current, [file.id]: "" }));
                                    }}
                                    value={assignmentValue}
                                  >
                                    <option value="">Select required document</option>
                                    {documents.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.name}
                                      </option>
                                    ))}
                                    <option value={deleteFileSelectValue}>DELETE FILE</option>
                                  </select>
                                </label>
                                <button
                                  className={`platform-btn ${
                                    assignmentValue === deleteFileSelectValue ? "danger" : "primary"
                                  }`}
                                  disabled={!assignmentValue || savingAssignmentIds[file.id]}
                                  onClick={(event) => void saveAssignment(file, event.currentTarget)}
                                  type="button"
                                >
                                  <Check aria-hidden="true" size={14} />
                                  {savingAssignmentIds[file.id] ? "Saving..." : "Save"}
                                </button>
                                {assignmentMessages[file.id] ? (
                                  <small className="platform-assignment-message success">
                                    {assignmentMessages[file.id]}
                                  </small>
                                ) : null}
                                {assignmentErrors[file.id] ? (
                                  <small className="platform-assignment-message error">
                                    {assignmentErrors[file.id]}
                                  </small>
                                ) : null}
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </aside>

      <article className="platform-section platform-application-upload-panel">
        <div className="platform-section-head compact">
          <div className="platform-application-title-stack">
            <span className="platform-kicker">Upload</span>
            <h2>Application Documents</h2>
          </div>
          <FileUp aria-hidden="true" size={24} />
        </div>

        <ServiceApplicationUploader
          applicationId={applicationId ?? undefined}
          assignmentValues={assignmentValues}
          onAssignmentSaved={handleAssignmentSaved}
          onUploadedFilesReady={handleUploadedFilesReady}
          requiredDocuments={documents}
          serviceId={serviceId}
        />
      </article>
    </section>
  );
}
