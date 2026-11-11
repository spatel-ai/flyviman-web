import { describe, expect, it } from "vitest";
import {
  isFiltered,
  parseUserFilter,
  ROLE_OPTIONS,
  serialiseUserFilter,
  STATUS_OPTIONS,
  userListQuery,
} from "./filters";

const parse = (query: string) => parseUserFilter(new URLSearchParams(query));
const ALL = { role: "ALL", status: "ALL", q: "", page: 1 } as const;

describe("parseUserFilter", () => {
  it("defaults to everyone, first page", () => {
    expect(parse("")).toEqual(ALL);
  });

  it("reads a valid view", () => {
    expect(parse("role=OPS&status=SUSPENDED&q=asha&page=2")).toEqual({
      role: "OPS",
      status: "SUSPENDED",
      q: "asha",
      page: 2,
    });
  });

  it("falls back to defaults for values it does not know", () => {
    expect(parse("role=ROOT&status=DELETED&page=zero")).toEqual(ALL);
    expect(parse("role=ops&status=active&page=-1")).toEqual(ALL);
    expect(parse("role=toString&status=constructor")).toEqual(ALL);
  });

  it("trims the search and keeps it within the API's limit", () => {
    expect(parse("q=%20asha%40example.com%20").q).toBe("asha@example.com");
    expect(parse(`q=${"9".repeat(150)}`).q).toHaveLength(100);
  });
});

describe("serialiseUserFilter", () => {
  it("leaves defaults out", () => {
    expect(serialiseUserFilter(ALL)).toBe("");
  });

  it("round-trips a view", () => {
    const filter = {
      role: "FINANCE_ADMIN",
      status: "ACTIVE",
      q: "+91 98",
      page: 4,
    } as const;
    expect(parse(serialiseUserFilter(filter))).toEqual(filter);
  });
});

describe("userListQuery", () => {
  it("sends only the filters that are set", () => {
    expect(userListQuery(ALL)).toEqual({
      role: undefined,
      status: undefined,
      q: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(
      userListQuery({ role: "OPS", status: "ACTIVE", q: "a", page: 2 }),
    ).toEqual({ role: "OPS", status: "ACTIVE", q: "a", page: 2, pageSize: 20 });
  });
});

describe("options", () => {
  it("offers every role and status after the catch-all", () => {
    expect(ROLE_OPTIONS.map((option) => option.label)).toEqual([
      "All roles",
      "Customer",
      "Operator administrator",
      "Operator staff",
      "Operations",
      "Finance",
      "Super administrator",
    ]);
    expect(STATUS_OPTIONS.map((option) => option.label)).toEqual([
      "All statuses",
      "Active",
      "Verification pending",
      "Suspended",
    ]);
  });
});

describe("isFiltered", () => {
  it("is false only for the default view", () => {
    expect(isFiltered(ALL)).toBe(false);
    expect(isFiltered({ ...ALL, page: 3 })).toBe(false);
    expect(isFiltered({ ...ALL, q: "a" })).toBe(true);
    expect(isFiltered({ ...ALL, role: "OPS" })).toBe(true);
  });
});
