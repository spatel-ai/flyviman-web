import { describe, expect, it } from "vitest";
import {
  EMPTY_PASSENGER,
  maskDocumentNumber,
  NONE,
  passengerSchema,
  profileSchema,
  toPassengerBody,
  toPassengerValues,
  toProfileBody,
} from "./schema";

describe("profile", () => {
  it("sends blanks as null", () => {
    expect(
      toProfileBody({
        firstName: " Asha ",
        lastName: "Rao",
        dateOfBirth: "",
        nationality: NONE,
      }),
    ).toEqual({
      firstName: "Asha",
      lastName: "Rao",
      dateOfBirth: null,
      nationality: null,
    });
  });

  it("rejects a date of birth in the future and a missing name", () => {
    const future = profileSchema.safeParse({
      firstName: "Asha",
      lastName: "Rao",
      dateOfBirth: "2999-01-01",
      nationality: "IN",
    });
    expect(future.error?.issues[0].path).toEqual(["dateOfBirth"]);
    expect(
      profileSchema.safeParse({
        firstName: " ",
        lastName: "Rao",
        dateOfBirth: "",
        nationality: "IN",
      }).success,
    ).toBe(false);
  });
});

describe("passenger", () => {
  const filled = {
    ...EMPTY_PASSENGER,
    firstName: "Kavya",
    lastName: "Rao",
    documentType: "PASSPORT",
    documentNumber: "P1234567",
    documentExpiry: "2031-01-31",
  };

  it("accepts a passenger with only a name", () => {
    expect(
      passengerSchema.safeParse({
        ...EMPTY_PASSENGER,
        firstName: "Kavya",
        lastName: "Rao",
      }).success,
    ).toBe(true);
  });

  it("needs a number when a document type is chosen", () => {
    const result = passengerSchema.safeParse({ ...filled, documentNumber: "" });
    expect(result.error?.issues[0].path).toEqual(["documentNumber"]);
  });

  it("rejects a document number with other characters", () => {
    expect(
      passengerSchema.safeParse({ ...filled, documentNumber: "<script>" })
        .success,
    ).toBe(false);
  });

  it("clears the number and expiry when there is no document", () => {
    const body = toPassengerBody({ ...filled, documentType: NONE });
    expect(body).toMatchObject({
      documentType: null,
      documentNumber: null,
      documentExpiry: null,
    });
  });

  it("round-trips an API passenger through the form", () => {
    const passenger = {
      id: "1",
      firstName: "Kavya",
      lastName: "Rao",
      dateOfBirth: "1990-04-12",
      gender: "FEMALE" as const,
      nationality: "IN",
      documentType: "PASSPORT" as const,
      documentNumber: "P1234567",
      documentExpiry: "2031-01-31",
      specialAssistance: null,
    };
    expect({
      id: "1",
      ...toPassengerBody(toPassengerValues(passenger)),
    }).toEqual(passenger);
  });

  it("shows only the last four characters of a document number", () => {
    expect(maskDocumentNumber("P1234567")).toBe("••••4567");
    expect(maskDocumentNumber("123")).toBe("123");
  });
});
