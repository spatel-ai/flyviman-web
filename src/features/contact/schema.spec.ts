import { describe, expect, it } from "vitest";
import { enquirySchema, toEnquiryBody, topicFrom } from "./schema";

const valid = {
  name: "Asha",
  email: "asha@example.test",
  phone: "",
  topic: "GENERAL",
  message: "Mumbai to Goa next week.",
} as const;

describe("enquiry schema", () => {
  it("accepts an email alone or a phone alone", () => {
    expect(enquirySchema.safeParse(valid).success).toBe(true);
    expect(
      enquirySchema.safeParse({ ...valid, email: "", phone: "+919876543210" })
        .success,
    ).toBe(true);
  });

  it("asks for a way to reply when both are empty, on the email field", () => {
    const result = enquirySchema.safeParse({ ...valid, email: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["email"]);
  });

  it("accepts a phone typed with spaces and sends it without them", () => {
    const result = enquirySchema.parse({
      ...valid,
      email: "",
      phone: "+91 98765 43210",
    });
    expect(result.phone).toBe("+919876543210");
  });

  it("refuses a phone without its country code", () => {
    expect(
      enquirySchema.safeParse({ ...valid, phone: "9876543210" }).success,
    ).toBe(false);
  });

  it("needs a message of at least 10 characters", () => {
    expect(enquirySchema.safeParse({ ...valid, message: "Hi" }).success).toBe(
      false,
    );
  });

  it("leaves empty contact fields out of the request", () => {
    expect(toEnquiryBody(enquirySchema.parse(valid))).toEqual({
      name: "Asha",
      email: "asha@example.test",
      topic: "GENERAL",
      message: "Mumbai to Goa next week.",
    });
  });
});

describe("topicFrom", () => {
  it("takes a known topic from the address and defaults to general", () => {
    expect(topicFrom("ELECTION_CHARTER")).toBe("ELECTION_CHARTER");
    expect(topicFrom("NOT_A_TOPIC")).toBe("GENERAL");
    expect(topicFrom(null)).toBe("GENERAL");
  });
});
