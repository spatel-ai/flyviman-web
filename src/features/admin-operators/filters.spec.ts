import { describe, expect, it } from "vitest";
import {
  emptyTitle,
  operatorListQuery,
  parseOperatorFilter,
  serialiseOperatorFilter,
} from "./filters";

const parse = (query: string) =>
  parseOperatorFilter(new URLSearchParams(query));

describe("parseOperatorFilter", () => {
  it("defaults to the review queue, first page, no search", () => {
    expect(parse("")).toEqual({ status: "PENDING_REVIEW", q: "", page: 1 });
  });

  it("reads a valid view", () => {
    expect(parse("status=SUSPENDED&q=sky&page=3")).toEqual({
      status: "SUSPENDED",
      q: "sky",
      page: 3,
    });
    expect(parse("status=ALL").status).toBe("ALL");
  });

  it.each(["status=approved", "status=DELETED", "status="])(
    "falls back to the default status for %s",
    (query) => {
      expect(parse(query).status).toBe("PENDING_REVIEW");
    },
  );

  it.each(["page=0", "page=-2", "page=abc", "page=1.5", "page="])(
    "falls back to the first page for %s",
    (query) => {
      expect(parse(query).page).toBe(1);
    },
  );

  it("trims the search and keeps it within the API's limit", () => {
    expect(parse("q=%20%20sky%20").q).toBe("sky");
    expect(parse(`q=${"a".repeat(150)}`).q).toHaveLength(100);
  });
});

describe("serialiseOperatorFilter", () => {
  it("leaves defaults out", () => {
    expect(
      serialiseOperatorFilter({ status: "PENDING_REVIEW", q: " ", page: 1 }),
    ).toBe("");
  });

  it("round-trips a view", () => {
    const filter = { status: "ALL" as const, q: "sky line", page: 2 };
    expect(parse(serialiseOperatorFilter(filter))).toEqual(filter);
  });
});

describe("operatorListQuery", () => {
  it("sends no status for All and no empty search", () => {
    expect(operatorListQuery({ status: "ALL", q: "", page: 1 })).toEqual({
      status: undefined,
      q: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("sends the status and search", () => {
    expect(
      operatorListQuery({ status: "REJECTED", q: "sky", page: 2 }),
    ).toMatchObject({ status: "REJECTED", q: "sky", page: 2 });
  });
});

describe("emptyTitle", () => {
  it("names the tab that is empty", () => {
    expect(emptyTitle({ status: "PENDING_REVIEW", q: "", page: 1 })).toBe(
      "No operators waiting for review",
    );
  });

  it("says when a search found nothing", () => {
    expect(emptyTitle({ status: "APPROVED", q: "sky", page: 1 })).toBe(
      "No operators match your search",
    );
  });
});
