import { describe, expect, it } from "vitest";
import { aircraftFieldErrors } from "./aircraft-create-schema";

const valid = {
  registration: "VT-ABC",
  manufacturer: "Cessna",
  model: "Citation",
  passengerCapacity: "6",
  rangeKm: "3000",
  homeBaseId: "loc-1",
};

describe("aircraftFieldErrors", () => {
  it("accepts a complete aircraft", () => {
    expect(aircraftFieldErrors(valid)).toEqual({});
  });

  it("names every empty field at once", () => {
    const errors = aircraftFieldErrors({
      registration: " ",
      manufacturer: "",
      model: "",
      passengerCapacity: "",
      rangeKm: "",
      homeBaseId: "",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "homeBaseId",
      "manufacturer",
      "model",
      "passengerCapacity",
      "rangeKm",
      "registration",
    ]);
  });

  it("applies the API's limits and refuses fractions", () => {
    expect(
      aircraftFieldErrors({ ...valid, passengerCapacity: "0" }),
    ).toHaveProperty("passengerCapacity");
    expect(
      aircraftFieldErrors({ ...valid, passengerCapacity: "101" }),
    ).toHaveProperty("passengerCapacity");
    expect(aircraftFieldErrors({ ...valid, rangeKm: "20001" })).toHaveProperty(
      "rangeKm",
    );
    expect(aircraftFieldErrors({ ...valid, rangeKm: "10.5" })).toHaveProperty(
      "rangeKm",
    );
    expect(
      aircraftFieldErrors({ ...valid, registration: "A".repeat(21) }),
    ).toHaveProperty("registration");
  });
});
