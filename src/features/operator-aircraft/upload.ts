import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Schemas } from "@/lib/api/types";

export type AircraftUploadPurpose =
  "AIRCRAFT_DOCUMENT" | "AIRCRAFT_PHOTO" | "AIRCRAFT_FLOOR_PLAN";

/**
 * Sends a file straight to storage through a signed URL and returns its id,
 * ready to attach to the aircraft. The signed URL carries its own
 * authorisation, so no cookies go with it.
 */
export async function upload(
  file: File,
  purpose: AircraftUploadPurpose,
): Promise<string> {
  const { data } = await apiFetch<Schemas["PresignUploadResponseDto"]>(
    "uploads/presign",
    {
      method: "POST",
      body: {
        purpose,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      },
    },
  );
  const response = await fetch(data.upload.url, {
    method: data.upload.method,
    headers: data.upload.headers as Record<string, string>,
    body: file,
    credentials: "omit",
  });
  if (!response.ok) {
    throw new ApiError(response.status, "UPLOAD_FAILED", "The upload failed.");
  }
  return data.fileId;
}
