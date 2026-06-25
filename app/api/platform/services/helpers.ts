export type ServiceDocumentInput = {
  id?: string;
  name: string;
  isRequired: boolean;
  sortOrder: number;
};

export type ServicePayload = {
  name: string;
  code: string;
  description?: string;
  status: "active" | "inactive";
  targetUsers: string;
  sortOrder: number;
  documents: ServiceDocumentInput[];
};

type DatabaseError = {
  code?: string;
  message?: string;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function parseServicePayload(body: unknown): {
  data?: ServicePayload;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { error: "Request body is required." };
  }

  const record = body as Record<string, unknown>;
  const name = cleanString(record.name);
  const code = normalizeCode(cleanString(record.code) || name);
  const description = cleanString(record.description);
  const status = cleanString(record.status).toLowerCase();
  const targetUsers = cleanString(record.targetUsers) || "public-schools";
  const sortOrder = cleanNumber(record.sortOrder, 0);
  const documents = Array.isArray(record.documents) ? record.documents : [];

  if (!name) {
    return { error: "Service name is required." };
  }

  if (!code) {
    return { error: "Service name must contain at least two letters or numbers." };
  }

  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
    return { error: "Service name must contain at least two letters or numbers." };
  }

  if (status !== "active" && status !== "inactive") {
    return { error: "Status must be active or inactive." };
  }

  const parsedDocuments = documents
    .map((item, index) => {
      const document = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: cleanString(document.id) || undefined,
        name: cleanString(document.name),
        isRequired: cleanBoolean(document.isRequired, true),
        sortOrder: cleanNumber(document.sortOrder, index + 1),
      };
    })
    .filter((document) => document.name);

  return {
    data: {
      name,
      code,
      description: description || undefined,
      status,
      targetUsers,
      sortOrder,
      documents: parsedDocuments,
    },
  };
}

export function mapServiceRows(
  services: Array<Record<string, unknown>>,
  documents: Array<Record<string, unknown>>,
) {
  return services.map((service) => ({
    id: String(service.id),
    code: String(service.code),
    name: String(service.name),
    description: typeof service.description === "string" ? service.description : "",
    status: service.status === "active" ? "active" : "inactive",
    targetUsers: service.target_users,
    sortOrder: service.sort_order,
    documents: documents
      .filter((document) => document.service_id === service.id)
      .map((document) => ({
        id: String(document.id),
        name: String(document.name),
        isRequired: Boolean(document.is_required),
        sortOrder: Number(document.sort_order),
      })),
  }));
}

export function serviceDatabaseErrorMessage(error: DatabaseError) {
  if (error.code === "23505") {
    if (error.message?.includes("services_code_key")) {
      return "A service with this name already exists. Use a different Service Name or edit the existing service.";
    }

    if (error.message?.includes("service_required_documents_service_id_name_key")) {
      return "This service has duplicate required document names. Each document name must be unique.";
    }

    return "A duplicate service record already exists.";
  }

  return error.message ?? "Unable to save service.";
}
