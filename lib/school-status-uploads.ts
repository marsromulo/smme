import { createHash, randomUUID } from "node:crypto";
import { curriculumOfferings, governmentSection } from "./school-status";
import { putR2Object } from "./r2";

export function statusDocumentPrefix(email: string) {
  return `school-status/${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}/`;
}

// Files travel with the form so registration needs no public upload endpoint.
export async function readSchoolStatusForm(request: Request, ownerEmail?: string) {
  const multipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const form = multipart ? await request.formData() : null;
  const body = form ? JSON.parse(String(form.get("payload"))) : await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid form.");
  const email = ownerEmail ?? body.representativeEmail;
  if (typeof email !== "string" || !email.trim()) throw new Error("Email address is required.");
  const prefix = statusDocumentPrefix(email);
  const uploads: { key: string; contentType: string; body: Buffer }[] = [];
  let total = 0;
  for (const offering of curriculumOfferings) {
    if (!Array.isArray(body.schoolOfferings) || !body.schoolOfferings.includes(offering)) continue;
    const section = governmentSection(offering);
    const entry = body.schoolStatuses?.[section.key];
    for (const field of section.details[entry?.status] ?? []) {
      if (field.type !== "file") continue;
      const file = form?.get(`${section.key}:${field.key}`);
      if (file instanceof File && file.size > 0) {
        total += file.size;
        if (file.size > 1024 * 1024 || total > 4 * 1024 * 1024) throw new Error("Each document must be 1 MB or smaller (4 MB total).");
        const bytes = Buffer.from(await file.arrayBuffer());
        const extension = file.type === "application/pdf" && bytes.subarray(0, 5).toString() === "%PDF-" ? "pdf"
          : file.type === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "png"
          : file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpg" : null;
        if (!extension) throw new Error(`${field.label} must be a PDF, JPG, or PNG file.`);
        const key = `${prefix}${randomUUID()}.${extension}`;
        entry.details = { ...entry.details, [field.key]: key };
        uploads.push({ key, contentType: file.type, body: bytes });
      } else {
        const key = entry?.details?.[field.key];
        if (!ownerEmail || typeof key !== "string" || !key.startsWith(prefix) || !/^school-status\/[a-f0-9]{64}\/[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(key)) {
          throw new Error(`Upload ${field.label} for ${offering}.`);
        }
      }
    }
  }
  return { body, upload: async () => { for (const file of uploads) await putR2Object(file); } };
}
