export type ChangeKind = "added" | "removed" | "changed" | "same";

export interface Change {
  /** Dotted path of the field, e.g. `config.percent`. */
  path: string;
  kind: ChangeKind;
  before?: unknown;
  after?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Objects are walked; arrays and scalars are compared as whole values. */
function flatten(value: unknown, prefix: string, out: Map<string, unknown>) {
  if (isObject(value) && Object.keys(value).length > 0) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.set(prefix || "(value)", value);
  }
}

/**
 * Compares the JSON before and after a change, field by field. Absent sides
 * (null) read as nothing: a record that was created has only added fields.
 */
export function diffJson(before: unknown, after: unknown): Change[] {
  const left = new Map<string, unknown>();
  const right = new Map<string, unknown>();
  if (before != null) flatten(before, "", left);
  if (after != null) flatten(after, "", right);

  const paths = [...new Set([...left.keys(), ...right.keys()])].sort();
  return paths.map((path): Change => {
    const hadBefore = left.has(path);
    const hasAfter = right.has(path);
    if (!hadBefore) return { path, kind: "added", after: right.get(path) };
    if (!hasAfter) return { path, kind: "removed", before: left.get(path) };
    const same =
      JSON.stringify(left.get(path)) === JSON.stringify(right.get(path));
    return {
      path,
      kind: same ? "same" : "changed",
      before: left.get(path),
      after: right.get(path),
    };
  });
}

/** One value as it reads in the diff. */
export function showValue(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
