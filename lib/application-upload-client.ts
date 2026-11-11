export async function uploadApplicationDocument(file: File, upload: { fileId: string; uploadUrl: string }) {
  let directResponse: Response | undefined;
  try {
    directResponse = await fetch(upload.uploadUrl, {
      body: file, headers: { "Content-Type": file.type }, method: "PUT",
    });
  } catch {
    // Browser/network restrictions on direct storage access can be bypassed by
    // sending the same prepared upload through our authenticated server route.
  }
  if (directResponse?.ok) return;
  if (file.size > 4 * 1024 * 1024) {
    throw new Error(`Unable to reach document storage for “${file.name}”. Open https://depedbaguio-sgod-smme.com without www and retry, or compress the file to 4 MB or smaller for the alternate upload connection.`);
  }
  let response: Response;
  try {
    response = await fetch(`/api/platform/application-files/${encodeURIComponent(upload.fileId)}/upload`, {
      body: file, headers: { "Content-Type": file.type }, method: "PUT",
    });
  } catch {
    throw new Error(`Unable to upload “${file.name}”. Check your internet connection and try again. Your selected files have been kept.`);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(typeof data?.error === "string" ? data.error : `Unable to upload “${file.name}” (error ${response.status}). Please try again.`);
  }
}
