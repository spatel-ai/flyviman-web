import { describe, expect, it } from "vitest";
import { diffJson, showValue } from "./diff";

describe("diffJson", () => {
  it("marks every field added when a record was created", () => {
    expect(
      diffJson(null, { config: { percent: 8 }, type: "COMMISSION" }),
    ).toEqual([
      { path: "config.percent", kind: "added", after: 8 },
      { path: "type", kind: "added", after: "COMMISSION" },
    ]);
  });

  it("marks changed, removed and unchanged fields", () => {
    const changes = diffJson(
      { a: 1, b: "x", c: { d: true } },
      { a: 2, b: "x", e: [1, 2] },
    );
    expect(changes).toEqual([
      { path: "a", kind: "changed", before: 1, after: 2 },
      { path: "b", kind: "same", before: "x", after: "x" },
      { path: "c.d", kind: "removed", before: true },
      { path: "e", kind: "added", after: [1, 2] },
    ]);
  });

  it("compares arrays as whole values and handles two empty sides", () => {
    expect(diffJson({ a: [1] }, { a: [1] })[0].kind).toBe("same");
    expect(diffJson(null, null)).toEqual([]);
  });

  it("keeps a scalar root", () => {
    expect(diffJson("old", "new")).toEqual([
      { path: "(value)", kind: "changed", before: "old", after: "new" },
    ]);
  });
});

describe("showValue", () => {
  it("shows strings plain and everything else as JSON", () => {
    expect(showValue("x")).toBe("x");
    expect(showValue(8)).toBe("8");
    expect(showValue(null)).toBe("null");
    expect(showValue({ a: 1 })).toBe('{"a":1}');
    expect(showValue(undefined)).toBe("");
  });
});
