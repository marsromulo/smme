"use client";

import { DragEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FilePlus2,
  GripVertical,
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
  status: "active" | "inactive";
  targetUsers: string;
  sortOrder: number;
  documents: ServiceDocument[];
};

type LoadState = "idle" | "loading" | "ready" | "error";
type ServiceForm = Omit<ServiceRecord, "id"> & { id: string };
type DocumentDraft = Pick<ServiceDocument, "name">;

const emptyDocumentDraft: DocumentDraft = {
  name: "",
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

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  if (!movedItem) {
    return items;
  }

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function applyDocumentSortOrder(documents: ServiceDocument[]) {
  return documents.map((document, index) => ({
    ...document,
    sortOrder: index + 1,
  }));
}

function applyServiceSortOrder(services: ServiceRecord[]) {
  return services.map((service, index) => ({
    ...service,
    sortOrder: index + 1,
  }));
}

function buildServicePayload(serviceForm: ServiceForm, sortOrder: number) {
  return {
    name: serviceForm.name,
    description: serviceForm.description,
    status: serviceForm.status,
    sortOrder,
    documents: serviceForm.documents
      .map((document, index) => ({
        ...document,
        name: document.name.trim(),
        sortOrder: index + 1,
      }))
      .filter((document) => document.name),
  };
}

export function ServicesMaintenanceClient() {
  const serviceEditorRef = useRef<HTMLElement | null>(null);
  const documentListRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<ServiceForm>(emptyForm);
  const documentDragStartDocumentsRef = useRef<ServiceDocument[]>([]);
  const hasDocumentOrderChangedRef = useRef(false);
  const documentDropCompletedRef = useRef(false);
  const draggedDocumentIndexRef = useRef<number | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [documentDraft, setDocumentDraft] = useState<DocumentDraft>(emptyDocumentDraft);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [hasDocumentOverflow, setHasDocumentOverflow] = useState(false);
  const [isDocumentListAtBottom, setIsDocumentListAtBottom] = useState(false);
  const [draggedDocumentIndex, setDraggedDocumentIndex] = useState<number | null>(null);
  const [draggedServiceId, setDraggedServiceId] = useState<string | null>(null);
  const [serviceOrderMessage, setServiceOrderMessage] = useState("");
  const [isReorderingServices, setIsReorderingServices] = useState(false);

  const isEditing = Boolean(form.id);

  const updateDocumentListScrollState = useCallback(() => {
    const list = documentListRef.current;

    if (!list) {
      setHasDocumentOverflow(false);
      setIsDocumentListAtBottom(false);
      return;
    }

    const hasOverflow = list.scrollHeight > list.clientHeight + 1;
    const isAtBottom = !hasOverflow || list.scrollTop + list.clientHeight >= list.scrollHeight - 2;

    setHasDocumentOverflow(hasOverflow);
    setIsDocumentListAtBottom(isAtBottom);
  }, []);

  const loadServices = useCallback(async () => {
    setLoadState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/platform/services");
      const result = (await response.json()) as { services?: ServiceRecord[]; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load services.");
      }

      setServices(applyServiceSortOrder(result.services ?? []));
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

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(updateDocumentListScrollState);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [form.documents, isEditorOpen, updateDocumentListScrollState]);

  useEffect(() => {
    const list = documentListRef.current;

    if (!list) {
      return;
    }

    window.addEventListener("resize", updateDocumentListScrollState);

    if (typeof ResizeObserver === "undefined") {
      updateDocumentListScrollState();
      return () => window.removeEventListener("resize", updateDocumentListScrollState);
    }

    const resizeObserver = new ResizeObserver(updateDocumentListScrollState);
    resizeObserver.observe(list);
    updateDocumentListScrollState();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDocumentListScrollState);
    };
  }, [form.documents.length, isEditorOpen, updateDocumentListScrollState]);

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
    setForm({
      ...emptyForm,
      sortOrder: services.length + 1,
    });
    setDocumentDraft(emptyDocumentDraft);
    setMessage("");
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
      documents: applyDocumentSortOrder(service.documents.map((document) => ({ ...document }))),
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
      documents: applyDocumentSortOrder([
        ...current.documents,
        {
          name,
          isRequired: true,
          sortOrder: current.documents.length + 1,
        },
      ]),
    }));
    setDocumentDraft(emptyDocumentDraft);
  }

  function removeDocument(index: number) {
    setForm((current) => ({
      ...current,
      documents: applyDocumentSortOrder(
        current.documents.filter((_, documentIndex) => documentIndex !== index),
      ),
    }));
  }

  function handleDocumentDragStart(index: number, event: DragEvent<HTMLDivElement>) {
    documentDragStartDocumentsRef.current = form.documents;
    hasDocumentOrderChangedRef.current = false;
    documentDropCompletedRef.current = false;
    draggedDocumentIndexRef.current = index;
    setDraggedDocumentIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleDocumentDragOver(targetIndex: number, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const currentDraggedIndex = draggedDocumentIndexRef.current;

    if (currentDraggedIndex === null || currentDraggedIndex === targetIndex) {
      return;
    }

    hasDocumentOrderChangedRef.current = true;
    setForm((current) => {
      const nextForm = {
        ...current,
        documents: applyDocumentSortOrder(
          reorderItems(current.documents, currentDraggedIndex, targetIndex),
        ),
      };

      formRef.current = nextForm;
      return nextForm;
    });
    draggedDocumentIndexRef.current = targetIndex;
    setDraggedDocumentIndex(targetIndex);
  }

  function handleDocumentDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    documentDropCompletedRef.current = true;
    draggedDocumentIndexRef.current = null;
    setDraggedDocumentIndex(null);

    if (!hasDocumentOrderChangedRef.current) {
      return;
    }

    const nextForm = formRef.current;

    if (nextForm.id) {
      void persistDocumentOrder(nextForm, documentDragStartDocumentsRef.current);
    }
  }

  function handleDocumentDragEnd() {
    if (hasDocumentOrderChangedRef.current && !documentDropCompletedRef.current) {
      const previousDocuments = documentDragStartDocumentsRef.current;

      setForm((current) => {
        const nextForm = {
          ...current,
          documents: previousDocuments,
        };

        formRef.current = nextForm;
        return nextForm;
      });
    }

    hasDocumentOrderChangedRef.current = false;
    documentDropCompletedRef.current = false;
    draggedDocumentIndexRef.current = null;
    setDraggedDocumentIndex(null);
  }

  async function persistDocumentOrder(nextForm: ServiceForm, previousDocuments: ServiceDocument[]) {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/platform/services/${nextForm.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildServicePayload(nextForm, nextForm.sortOrder)),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update required document order.");
      }

      setServices((current) =>
        current.map((service) =>
          service.id === nextForm.id ? { ...service, documents: nextForm.documents } : service,
        ),
      );
      setMessage("Required document order updated.");
    } catch (error) {
      setForm((current) =>
        current.id === nextForm.id
          ? { ...current, documents: previousDocuments }
          : current,
      );
      setMessage(error instanceof Error ? error.message : "Unable to update required document order.");
    } finally {
      setIsSaving(false);
    }
  }

  async function persistServiceOrder(nextServices: ServiceRecord[]) {
    setIsReorderingServices(true);
    setServiceOrderMessage("");

    try {
      const response = await fetch("/api/platform/services/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          services: nextServices.map((service) => ({
            id: service.id,
            sortOrder: service.sortOrder,
          })),
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to reorder services.");
      }
    } catch (error) {
      setServiceOrderMessage(error instanceof Error ? error.message : "Unable to reorder services.");
      await loadServices();
    } finally {
      setIsReorderingServices(false);
    }
  }

  function handleServiceDragStart(serviceId: string, event: DragEvent<HTMLTableRowElement>) {
    setDraggedServiceId(serviceId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", serviceId);
  }

  function handleServiceDragOver(event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleServiceDrop(targetServiceId: string, event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();

    if (!draggedServiceId || draggedServiceId === targetServiceId || isReorderingServices) {
      setDraggedServiceId(null);
      return;
    }

    const fromIndex = services.findIndex((service) => service.id === draggedServiceId);
    const toIndex = services.findIndex((service) => service.id === targetServiceId);

    if (fromIndex < 0 || toIndex < 0) {
      setDraggedServiceId(null);
      return;
    }

    const nextServices = applyServiceSortOrder(reorderItems(services, fromIndex, toIndex));
    setServices(nextServices);
    setDraggedServiceId(null);
    void persistServiceOrder(nextServices);
  }

  function handleServiceDragEnd() {
    setDraggedServiceId(null);
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    const payload = buildServicePayload(form, isEditing ? form.sortOrder : services.length + 1);

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
        {!isEditing ? (
          <button className="platform-btn primary" type="button" onClick={startNewService}>
            <Plus aria-hidden="true" size={18} />
            New Service
          </button>
        ) : null}
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
                  <option value="inactive">Inactive</option>
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
                <h2>Required Documents ({form.documents.length})</h2>
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
                  <div className="platform-document-list-frame">
                    <div
                      className="platform-document-list"
                      ref={documentListRef}
                      onScroll={updateDocumentListScrollState}
                    >
                      {form.documents.map((document, index) => (
                        <div
                          className={`platform-document-list-item${draggedDocumentIndex === index ? " dragging" : ""}`}
                          draggable
                          key={`${document.id ?? "new"}-${index}`}
                          onDragEnd={handleDocumentDragEnd}
                          onDragOver={(event) => handleDocumentDragOver(index, event)}
                          onDragStart={(event) => handleDocumentDragStart(index, event)}
                          onDrop={handleDocumentDrop}
                        >
                          <span className="platform-drag-handle" aria-hidden="true">
                            <GripVertical size={15} />
                          </span>
                          <span className="platform-sort-number">{index + 1}</span>
                          <span className="platform-document-list-name">{document.name}</span>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            aria-label={`Remove ${document.name}`}
                          >
                            <Trash2 aria-hidden="true" size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {hasDocumentOverflow ? (
                      <span className="platform-document-scroll-indicator" aria-hidden="true">
                        {isDocumentListAtBottom ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </span>
                    ) : null}
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
        {serviceOrderMessage ? <p className="platform-approval-message">{serviceOrderMessage}</p> : null}

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
                  <th>Order</th>
                  <th>Service Name</th>
                  <th>Number of Documents</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service, index) => (
                  <tr
                    className={draggedServiceId === service.id ? "dragging" : undefined}
                    draggable={!isReorderingServices}
                    key={service.id}
                    onDragEnd={handleServiceDragEnd}
                    onDragOver={handleServiceDragOver}
                    onDragStart={(event) => handleServiceDragStart(service.id, event)}
                    onDrop={(event) => handleServiceDrop(service.id, event)}
                  >
                    <td>
                      <span className="platform-table-order">
                        <GripVertical aria-hidden="true" size={15} />
                        {index + 1}
                      </span>
                    </td>
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
