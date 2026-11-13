/**
 * Operator compliance document types, in the order the onboarding form
 * offers them. One list for the onboarding form, the admin review and the
 * expiring-documents page (aircraft documents: `aircraftDocumentLabel` in
 * ./aircraft).
 */
export const OPERATOR_DOCUMENT_TYPES = [
  { value: "AOC", label: "Air operator certificate" },
  { value: "INSURANCE", label: "Insurance certificate" },
  { value: "REGISTRATION", label: "Company registration" },
  { value: "OTHER", label: "Other" },
] as const;

/** The wording for an operator document type; an unknown type as it is. */
export function operatorDocumentLabel(type: string): string {
  return (
    OPERATOR_DOCUMENT_TYPES.find((option) => option.value === type)?.label ??
    type
  );
}
