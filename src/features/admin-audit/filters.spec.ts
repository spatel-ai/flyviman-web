import { describe, expect, it } from "vitest";
import {
  auditListQuery,
  EMPTY_FILTER,
  isFiltered,
  parseAuditFilter,
  serialiseAuditFilter,
} from "./filters";

const parse = (query: string) => parseAuditFilter(new URLSearchParams(query));
const ID = "0b1f6a1e-3c1e-4d52-9b0e-6f7f1f2a3b4c";

describe("parseAuditFilter", () => {
  it("defaults to everything, first page", () => {
    expect(parse("")).toEqual(EMPTY_FILTER);
  });

  it("reads a valid view", () => {
    expect(
      parse(
        `action=pricing_rule.change&entityType=PricingRule&actorId=${ID}&from=2026-11-01&to=2026-11-19&page=3`,
      ),
    ).toMatchObject({
      action: "pricing_rule.change",
      entityType: "PricingRule",
      actorId: ID,
      from: "2026-11-01",
      to: "2026-11-19",
      page: 3,
    });
  });

  it("drops values it cannot use", () => {
    expect(parse("actorId=nobody&from=yesterday&to=2026-13-45&page=0")).toEqual(
      EMPTY_FILTER,
    );
  });
});

describe("serialiseAuditFilter", () => {
  it("leaves defaults out and round-trips a view", () => {
    expect(serialiseAuditFilter(EMPTY_FILTER)).toBe("");
    const view = {
      ...EMPTY_FILTER,
      action: "auth.login",
      actorId: ID,
      from: "2026-11-01",
      page: 2,
    };
    expect(parse(serialiseAuditFilter(view))).toEqual(view);
  });
});

describe("auditListQuery", () => {
  it("sends nothing for an empty view", () => {
    expect(auditListQuery(EMPTY_FILTER)).toMatchObject({
      action: undefined,
      from: undefined,
      to: undefined,
      page: 1,
    });
  });

  it("turns Indian calendar days into UTC instants", () => {
    const query = auditListQuery({
      ...EMPTY_FILTER,
      from: "2026-11-02",
      to: "2026-11-02",
    });
    expect(query.from).toBe("2026-11-01T18:30:00.000Z");
    expect(query.to).toBe("2026-11-02T18:29:59.999Z");
  });

  it("knows when it is filtered", () => {
    expect(isFiltered(EMPTY_FILTER)).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTER, page: 4 })).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTER, entityType: "User" })).toBe(true);
  });
});
