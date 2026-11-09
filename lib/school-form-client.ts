import type { SchoolStatuses } from "./school-status";

const maxFileBytes = 1024 * 1024;
const maxTotalBytes = 4 * maxFileBytes;

export function prepareSchoolForm(form: FormData): FormData {
  const body = new FormData();
  const payload = form.get("payload");
  if (typeof payload !== "string") throw new Error("Unable to prepare the form. Please refresh and try again.");
  body.set("payload", payload);
  let total = 0;
  for (const [name, value] of form.entries()) {
    if (!(value instanceof File) || value.size === 0) continue;
    if (value.size > maxFileBytes) throw new Error(`“${value.name}” is too large. Each document must be 1 MB or smaller. Please compress it and try again.`);
    if (!["application/pdf", "image/jpeg", "image/png"].includes(value.type)) throw new Error(`“${value.name}” must be a PDF, JPG, or PNG file.`);
    total += value.size;
    if (total > maxTotalBytes) throw new Error("The documents exceed the 4 MB total upload limit. Please compress them and try again.");
    body.append(name, value);
  }
  return body;
}

export async function readSchoolFormResponse(response: Response): Promise<{ schoolStatuses?: SchoolStatuses }> {
  if (response.status === 413) throw new Error("The upload is too large. Each document must be 1 MB or smaller, with a maximum of 4 MB total.");
  if (response.status === 429) throw new Error("Too many requests. Please wait a moment before trying again.");
  if (response.status === 401 || response.status === 403) throw new Error("Your session could not be verified. Please refresh the page or sign in again.");

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(response.ok
      ? "The server returned an unexpected response. Please check whether your registration or profile was saved before trying again."
      : `The server could not process the form (error ${response.status}). Please try again shortly. Your entries have been kept.`);
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("The server returned an unexpected response. Please try again shortly.");
  if (!response.ok) {
    const error = "error" in result ? result.error : undefined;
    throw new Error(typeof error === "string" && error ? error : "Unable to save the form. Please try again.");
  }
  return result as { schoolStatuses?: SchoolStatuses };
}

export function schoolFormErrorMessage(error: unknown): string {
  if (error instanceof TypeError || (error instanceof Error && error.name === "SyntaxError")) {
    return "The form could not be sent or the server response could not be read. Check your connection and try again. Your entries have been kept.";
  }
  return error instanceof Error ? error.message : "Unable to save the form. Please try again.";
}
