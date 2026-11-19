/** The distinct `{{name}}` placeholders in a text. */
export function placeholdersOf(text: string): Set<string> {
  return new Set(
    [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]),
  );
}

/**
 * Says what is wrong with a template's wording, or `null`. The API checks
 * the same rule; this only saves a round trip.
 */
export function placeholderProblem(
  required: string[],
  subject: string,
  body: string,
): string | null {
  const present = new Set([
    ...placeholdersOf(subject),
    ...placeholdersOf(body),
  ]);
  const name = (n: string) => `{{${n}}}`;
  const missing = required.filter((n) => !present.has(n));
  if (missing.length > 0) {
    return `Keep the placeholders ${missing.map(name).join(", ")}.`;
  }
  const unknown = [...present].filter((n) => !required.includes(n));
  if (unknown.length > 0) {
    return `Remove ${unknown.map(name).join(", ")}: it is not filled in for this message.`;
  }
  return null;
}
