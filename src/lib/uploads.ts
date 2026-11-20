import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Schemas } from "@/lib/api/types";

/**
 * Reserving a file, sending it to storage, for features that attach
 * uploads (air ambulance documents; the operator onboarding form keeps its
 * own copy for now). Limits are the API's (security-rbac.md, Uploads).
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const UPLOAD_FAILED =
  "The upload did not complete. Check your connection and try again.";

/** What is wrong with a chosen file, or `null` when it can be uploaded. */
export function fileProblem(file: {
  type: string;
  size: number;
}): string | null {
  if (!(ACCEPTED_FILE_TYPES as readonly string[]).includes(file.type)) {
    return "Choose a PDF, JPEG or PNG file.";
  }
  if (file.size === 0) return "This file is empty. Choose another file.";
  if (file.size > MAX_UPLOAD_BYTES) {
    return "This file is larger than 10 MB. Choose a smaller file.";
  }
  return null;
}

/**
 * Reserves the file for `purpose` and sends it straight to storage with the
 * signed target; answers the file id to attach. The one documented
 * exception to "everything through apiFetch": the signed URL carries its
 * own authorisation, so no cookies or CSRF header are sent.
 */
export async function uploadFile(
  purpose: Schemas["PresignUploadDto"]["purpose"],
  file: File,
): Promise<string> {
  const { data: presigned } = await apiFetch<
    Schemas["PresignUploadResponseDto"]
  >("uploads/presign", {
    method: "POST",
    body: {
      purpose,
      fileName: file.name,
      // Checked against the accepted types by fileProblem first.
      contentType: file.type as Schemas["PresignUploadDto"]["contentType"],
      sizeBytes: file.size,
    } satisfies Schemas["PresignUploadDto"],
  });
  let response: Response;
  try {
    response = await fetch(presigned.upload.url, {
      method: presigned.upload.method,
      headers: presigned.upload.headers as Record<string, string>,
      body: file,
      credentials: "omit",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", UPLOAD_FAILED);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string };
    } | null;
    const code =
      body?.error?.code ??
      (response.status === 413 ? "UPLOAD_TOO_LARGE" : "UPLOAD_FAILED");
    throw new ApiError(response.status, code, UPLOAD_FAILED);
  }
  return presigned.fileId;
}
