import { describe, expect, it } from "vitest";
import {
  EMPTY_REQUEST,
  requestSchema,
  toRequestBody,
  type RequestValues,
} from "./schema";

const VALID: RequestValues = {
  ...EMPTY_REQUEST,
  contactName: "Asha Rao",
  contactPhone: "+91 98000 00001",
  originLocationId: "loc-1",
  destinationLocationId: "loc-2",
  preferredDate: "2030-01-15",
  preferredTime: "09:30",
  patientCount: "1",
  accompanyingPersons: "2",
  patientCondition: "Stable after surgery, on monitoring.\nNeeds oxygen.",
  mobility: "NON_AMBULATORY",
  stretcherRequired: true,
  oxygenRequired: true,
};

function issues(values: Partial<RequestValues>) {
  const result = requestSchema.safeParse({ ...VALID, ...values });
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join("."),
          issue.message,
        ]),
      );
}

describe("air ambulance request form", () => {
  it("accepts a complete request", () => {
    expect(issues({})).toEqual({});
  });

  it("needs the contact, the condition, the mobility and both places", () => {
    const found = issues({
      contactName: " ",
      patientCondition: "",
      mobility: "",
      originLocationId: "",
      destinationLocationId: "",
    });
    expect(Object.keys(found).sort()).toEqual([
      "contactName",
      "destinationLocationId",
      "mobility",
      "originLocationId",
      "patientCondition",
    ]);
  });

  it("refuses the same place at both ends", () => {
    expect(issues({ destinationLocationId: "loc-1" })).toHaveProperty(
      "destinationLocationId",
    );
  });

  it("applies the API's limits", () => {
    expect(issues({ contactPhone: "98000 00001" })).toHaveProperty(
      "contactPhone",
    );
    expect(issues({ emergencyContactPhone: "12345" })).toHaveProperty(
      "emergencyContactPhone",
    );
    expect(issues({ patientCount: "5" })).toHaveProperty("patientCount");
    expect(issues({ patientCount: "0" })).toHaveProperty("patientCount");
    expect(issues({ accompanyingPersons: "7" })).toHaveProperty(
      "accompanyingPersons",
    );
    expect(issues({ accompanyingPersons: "1.5" })).toHaveProperty(
      "accompanyingPersons",
    );
    expect(issues({ patientCondition: "x".repeat(2001) })).toHaveProperty(
      "patientCondition",
    );
    expect(issues({ pickupAddress: "x".repeat(301) })).toHaveProperty(
      "pickupAddress",
    );
    expect(issues({ destinationFacility: "x".repeat(201) })).toHaveProperty(
      "destinationFacility",
    );
    expect(issues({ medicalStaffRequired: "x".repeat(1001) })).toHaveProperty(
      "medicalStaffRequired",
    );
  });

  it("refuses hidden characters, keeping line breaks in long text", () => {
    expect(issues({ contactName: "Asha‮Rao" })).toHaveProperty("contactName");
    expect(issues({ contactName: "Asha\nRao" })).toHaveProperty("contactName");
    expect(issues({ notes: "Line one\u0007" })).toHaveProperty("notes");
    expect(issues({ notes: "Line one\nLine two" })).toEqual({});
  });

  it("builds the API body: India time to UTC, numbers, empty optionals left out", () => {
    const body = toRequestBody(requestSchema.parse(VALID));
    expect(body).toEqual({
      contactName: "Asha Rao",
      contactPhone: "+919800000001",
      contactEmail: undefined,
      emergencyContactName: undefined,
      emergencyContactPhone: undefined,
      originLocationId: "loc-1",
      destinationLocationId: "loc-2",
      pickupAddress: undefined,
      destinationFacility: undefined,
      preferredAt: "2030-01-15T04:00:00.000Z",
      patientCount: 1,
      accompanyingPersons: 2,
      medical: {
        patientCondition: "Stable after surgery, on monitoring.\nNeeds oxygen.",
        mobility: "NON_AMBULATORY",
        stretcherRequired: true,
        oxygenRequired: true,
        medicalStaffRequired: undefined,
        equipmentRequired: undefined,
        specialisedCare: undefined,
        notes: undefined,
      },
    });
    // JSON leaves the empty optionals out entirely.
    expect(JSON.stringify(body)).not.toContain("contactEmail");
  });
});
