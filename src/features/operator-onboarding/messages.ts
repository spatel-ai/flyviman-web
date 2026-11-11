import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";

/** Wording for the operator and upload error codes, keyed by `code`. */
const MESSAGES: Record<string, string> = {
  OPERATOR_UNDER_REVIEW:
    "Your application is under review. You cannot make changes until a decision is made.",
  OPERATOR_FIELD_LOCKED:
    "The company names, registration number, GSTIN and services cannot be changed after approval. Contact support.",
  OPERATOR_DOCUMENT_LOCKED:
    "A verified document cannot be removed. Upload its replacement instead.",
  OPERATOR_PROFILE_INCOMPLETE:
    "Your application is not complete yet. Finish the items listed below.",
  UPLOAD_TYPE_MISMATCH:
    "The file's contents do not match its type. Upload a PDF, JPEG or PNG.",
  UPLOAD_TOO_LARGE: "This file is larger than 10 MB. Choose a smaller file.",
  UPLOAD_NOT_FOUND:
    "The upload did not complete. Choose the file and try again.",
};

/** A message for any thrown value, with this feature's wording first. */
export function onboardingMessage(error: unknown): string {
  if (error instanceof ApiError && Object.hasOwn(MESSAGES, error.code)) {
    return MESSAGES[error.code];
  }
  return messageFor(error);
}

export function hasCode(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code;
}
