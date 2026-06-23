"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  FilePlus2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

type ServiceDocument = {
  id?: string;
  name: string;
  isRequired: boolean;
  sortOrder: number;
};

type ServiceRecord = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "active" | "draft" | "archived";
  targetUsers: string;
  sortOrder: number;
  documents: ServiceDocument[];
};

type LoadState = "idle" | "loading" | "ready" | "error";
type ServiceForm = Omit<ServiceRecord, "id"> & { id: string };
type DocumentDraft = Pick<ServiceDocument, "name" | "isRequired">;

const emptyDocumentDraft: DocumentDraft = {
  name: "",
  isRequired: true,
};

const emptyForm: ServiceForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  status: "active" as ServiceRecord["status"],
  targetUsers: "public-schools",
  sortOrder: 0,
  documents: [],
};

export function ServicesMaintenanceClient() {
  const serviceEditorRef = useRef<HTMLElement | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [documentDraft, setDocumentDraft] = useState<DocumentDraft>(emptyDocumentDraft);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const isEditing = Boolean(form.id);

  const loadServices = useCallback(async () => {
    setLoadState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/platform/services");
      const result = (await response.json()) as { services?: ServiceRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load services.");
      }

      setServices(result.services ?? []);
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setMessage(error instanceof Error ? error.message : "Unable to load services.");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadServices();
    });
  }, [loadServices]);

  function resetForm() {
    setForm(emptyForm);
    setDocumentDraft(emptyDocumentDraft);
    setMessage("");
  }

  function scrollToEditor() {
    window.requestAnimationFrame(() => {
      serviceEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function startNewService() {
    resetForm();
    setIsEditorOpen(true);
    scrollToEditor();
  }

  function editService(service: ServiceRecord) {
    setForm({
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      status: service.status,
      targetUsers: service.targetUsers === "schools" ? "public-schools" : service.targetUsers,
      sortOrder: service.sortOrder,
      documents: service.documents.map((document) => ({ ...document })),
    });
    setDocumentDraft(emptyDocumentDraft);
    setMessage("");
    setIsEditorOpen(true);
    scrollToEditor();
  }

  function addDocument() {
    const name = documentDraft.name.trim();

    if (!name) {
      return;
    }

    setForm((current) => ({
      ...current,
      documents: [
        ...current.documents,
        {
          name,
          isRequired: documentDraft.isRequired,
          sortOrder: (current.documents.length + 1) * 10,
        },
      ],
    }));
    setDocumentDraft(emptyDocumentDraft);
  }

  function removeDocument(index: number) {
    setForm((current) => ({
      ...current,
      documents: current.documents.filter((_, documentIndex) => documentIndex !== index),
    }));
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    const payload = {
      name: form.name,
      description: form.description,
      status: form.status,
      sortOrder: form.sortOrder,
      documents: form.documents
        .map((document, index) => ({
          ...document,
          name: document.name.trim(),
          sortOrder: (index + 1) * 10,
        }))
        .filter((document) => document.name),
    };

    try {
      const response = await fetch(
        isEditing ? `/api/platform/services/${form.id}` : "/api/platform/services",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save service.");
      }

      resetForm();
      setMessage(isEditing ? "Service updated." : "Service created.");
      await loadServices();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save service.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <span className="platform-kicker">Admin maintenance</span>
          <h1>Services</h1>
          <p>Create application services and define the required documents schools must submit.</p>
        </div>
        <button className="platform-btn primary" type="button" onClick={startNewService}>
          <Plus aria-hidden="true" size={18} />
          New Service
        </button>
      </section>

      {isEditorOpen ? (
        <section className="platform-service-maintenance-grid">
          <article className="platform-section platform-service-editor" ref={serviceEditorRef}>
            <div className="platform-section-head compact">
              <div>
                <span className="platform-kicker">{isEditing ? "Edit service" : "Create service"}</span>
                <h2>Service Details</h2>
              </div>
            </div>
            <form className="platform-maintenance-form" onSubmit={saveService}>
              <label className="platform-maintenance-service-name">
                <span>Service Name</span>
                <input
                  type="text"
                  placeholder="Enter service name"
                  value={form.name}
                  required
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="platform-maintenance-description">
                <span>Description</span>
                <textarea
                  placeholder="Describe what this service is for"
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="platform-maintenance-sort-order">
                <span>Sort Order</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))
                  }
                />
              </label>
              <label className="platform-maintenance-status">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ServiceRecord["status"],
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <div className="platform-maintenance-wide platform-form-actions">
                <button className="platform-btn primary" type="submit" disabled={isSaving}>
                  <Save aria-hidden="true" size={18} />
                  {isSaving ? "Saving..." : isEditing ? "Update Service" : "Create Service"}
                </button>
                <button className="platform-filter-button" type="button" onClick={resetForm}>
                  Clear
                </button>
              </div>
            </form>
          </article>

          <article className="platform-section platform-document-editor">
            <div className="platform-section-head compact">
              <div>
                <span className="platform-kicker">Checklist builder</span>
                <h2>Required Documents</h2>
              </div>
            </div>
            {message ? <p className="platform-approval-message">{message}</p> : null}
            <div className="platform-required-documents-panel">
              <p>
                Add the documents that schools must upload when applying for this service.
                Empty document rows are ignored when saving.
              </p>
              <div className="platform-document-crud">
                <div className="platform-document-entry">
                  <label className="platform-document-name-field">
                    <input
                      type="text"
                      placeholder="Enter document name"
                      value={documentDraft.name}
                      onChange={(event) =>
                        setDocumentDraft((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <div className="platform-document-row-controls">
                    <label>
                      <input
                        type="checkbox"
                        checked={documentDraft.isRequired}
                        onChange={(event) =>
                          setDocumentDraft((current) => ({
                            ...current,
                            isRequired: event.target.checked,
                          }))
                        }
                      />
                      Required
                    </label>
                    <button
                      className="platform-document-add-button"
                      type="button"
                      onClick={addDocument}
                      disabled={!documentDraft.name.trim()}
                    >
                      <FilePlus2 aria-hidden="true" size={16} />
                      Add
                    </button>
                  </div>
                </div>
                {form.documents.length > 0 ? (
                  <div className="platform-document-list">
                    {form.documents.map((document, index) => (
                      <div className="platform-document-list-item" key={`${document.id ?? "new"}-${index}`}>
                        <span className="platform-document-list-name">{document.name}</span>
                        <div className="platform-document-list-meta">
                          <span className="platform-document-requirement">
                            {document.isRequired ? "Required" : "Optional"}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            aria-label={`Remove ${document.name}`}
                          >
                            <Trash2 aria-hidden="true" size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="platform-document-empty">No required documents added yet.</p>
                )}
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="platform-section">
        <div className="platform-section-head">
          <div>
            <span className="platform-kicker">Services</span>
            <h2>Applications Schools Can Apply For</h2>
          </div>
          <button className="platform-filter-button" type="button" onClick={loadServices}>
            <RefreshCw aria-hidden="true" size={17} />
            Refresh
          </button>
        </div>

        {loadState === "loading" ? (
          <p className="platform-empty-state">Loading services...</p>
        ) : loadState === "idle" ? (
          <p className="platform-empty-state">Preparing service records...</p>
        ) : services.length === 0 ? (
          <p className="platform-empty-state">No services found.</p>
        ) : (
          <div className="platform-maintenance-table-wrap">
            <table className="platform-maintenance-table">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Number of Documents</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <strong>{service.name}</strong>
                    </td>
                    <td>{service.documents.length}</td>
                    <td>
                      <button type="button" onClick={() => editService(service)}>
                        <Pencil aria-hidden="true" size={16} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
