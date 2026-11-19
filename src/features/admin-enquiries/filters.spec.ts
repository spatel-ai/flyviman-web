import { describe, expect, it } from "vitest";
import {
  enquiryListQuery,
  isFiltered,
  parseEnquiryFilter,
  serialiseEnquiryFilter,
  topicLabel,
} from "./filters";

const parse = (query: string) => parseEnquiryFilter(new URLSearchParams(query));
const ALL = { handled: "ALL", topic: "ALL", page: 1 } as const;

describe("parseEnquiryFilter", () => {
  it("defaults to everything, first page", () => {
    expect(parse("")).toEqual(ALL);
  });

  it("reads a valid view", () => {
    expect(parse("handled=UNHANDLED&topic=CONSULTANCY&page=3")).toEqual({
      handled: "UNHANDLED",
      topic: "CONSULTANCY",
      page: 3,
    });
  });

  it("falls back to defaults for values it does not know", () => {
    expect(parse("handled=maybe&topic=SPACE&page=0")).toEqual(ALL);
  });
});

describe("serialiseEnquiryFilter", () => {
  it("leaves defaults out and round-trips a view", () => {
    expect(serialiseEnquiryFilter(ALL)).toBe("");
    const view = { handled: "HANDLED", topic: "PILOT_JOBS", page: 2 } as const;
    expect(parse(serialiseEnquiryFilter(view))).toEqual(view);
  });
});

describe("enquiryListQuery", () => {
  it("sends handled as true or false, and nothing when not filtering", () => {
    expect(enquiryListQuery(ALL)).toMatchObject({ handled: undefined });
    expect(enquiryListQuery({ ...ALL, handled: "HANDLED" }).handled).toBe(
      "true",
    );
    expect(enquiryListQuery({ ...ALL, handled: "UNHANDLED" }).handled).toBe(
      "false",
    );
  });

  it("knows when it is filtered", () => {
    expect(isFiltered(ALL)).toBe(false);
    expect(isFiltered({ ...ALL, topic: "GENERAL" })).toBe(true);
  });
});

describe("topicLabel", () => {
  it("names a topic and shows an unknown one as sent", () => {
    expect(topicLabel("PILOT_JOBS")).toBe("Pilot job assistance");
    expect(topicLabel("NEW_TOPIC")).toBe("NEW_TOPIC");
  });
});
