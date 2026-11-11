import { describe, expect, it } from "vitest";
import {
  canSubmit,
  companyDetailsSchema,
  fileProblem,
  formatDay,
  MAX_UPLOAD_BYTES,
  missingChecklist,
  missingLabel,
  parseRegions,
  toFormValues,
  toUpdateBody,
  type CompanyDetailsValues,
  type OperatorProfile,
} from "./schema";

const VALID: CompanyDetailsValues = {
  legalName: "Skyline Aviation Private Limited",
  tradingName: "Skyline",
  registrationNumber: "U62100MH2015PTC123456",
  taxNumber: "27AAACS1234A1Z5",
  contactName: "Meera Nair",
  contactEmail: "meera@skyline.example",
  contactPhone: "+919876543210",
  businessAddress: {
    line1: "Hangar 4, Juhu Aerodrome",
    line2: "",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400049",
    country: "IN",
  },
  serviceCategories: ["PRIVATE_CHARTER", "HELICOPTER"],
  operatingRegions: "Maharashtra, Goa",
};

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
};

function issuePaths(values: CompanyDetailsValues): string[] {
  const result = companyDetailsSchema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
}

describe("companyDetailsSchema", () => {
  it("accepts complete details", () => {
    expect(issuePaths(VALID)).toEqual([]);
  });

  it("rejects a phone number that is not in international format", () => {
    expect(issuePaths({ ...VALID, contactPhone: "9876543210" })).toEqual([
      "contactPhone",
    ]);
    expect(issuePaths({ ...VALID, contactPhone: "+0123" })).toEqual([
      "contactPhone",
    ]);
  });

  it("allows the phone number to be left empty", () => {
    expect(issuePaths({ ...VALID, contactPhone: "" })).toEqual([]);
  });

  it("rejects a postal code the API would refuse", () => {
    for (const postalCode of ["4", "400_049", "4000490000000"]) {
      expect(
        issuePaths({
          ...VALID,
          businessAddress: { ...VALID.businessAddress, postalCode },
        }),
      ).toEqual(["businessAddress.postalCode"]);
    }
  });

  it("rejects a country that is not a two-letter code", () => {
    expect(
      issuePaths({
        ...VALID,
        businessAddress: { ...VALID.businessAddress, country: "India" },
      }),
    ).toEqual(["businessAddress.country"]);
  });

  it("saves a draft with no categories, registration number or address", () => {
    expect(
      issuePaths({
        ...VALID,
        tradingName: "",
        registrationNumber: "",
        taxNumber: "",
        businessAddress: EMPTY_ADDRESS,
        serviceCategories: [],
        operatingRegions: "",
      }),
    ).toEqual([]);
  });

  it("asks for the rest of an address once part of it is filled in", () => {
    expect(
      issuePaths({
        ...VALID,
        businessAddress: { ...EMPTY_ADDRESS, city: "Mumbai" },
      }),
    ).toEqual([
      "businessAddress.line1",
      "businessAddress.state",
      "businessAddress.postalCode",
    ]);
  });

  it("requires the legal name, contact name and a valid email", () => {
    expect(
      issuePaths({
        ...VALID,
        legalName: " ",
        contactName: "",
        contactEmail: "meera",
      }),
    ).toEqual(["legalName", "contactName", "contactEmail"]);
  });

  it("rejects a category operators cannot offer", () => {
    const values = {
      ...VALID,
      serviceCategories: ["SCHEDULED_AIRLINE"],
    } as unknown as CompanyDetailsValues;
    expect(issuePaths(values)).toEqual(["serviceCategories.0"]);
  });

  it("limits the number of regions", () => {
    const regions = Array.from({ length: 51 }, (_, index) => `Region ${index}`);
    expect(
      issuePaths({ ...VALID, operatingRegions: regions.join(",") }),
    ).toEqual(["operatingRegions"]);
  });
});

describe("parseRegions", () => {
  it("splits, trims and drops blanks", () => {
    expect(parseRegions(" Maharashtra ,Goa,, ,  Tamil   Nadu ")).toEqual([
      "Maharashtra",
      "Goa",
      "Tamil Nadu",
    ]);
  });

  it("removes duplicates without regard to case, keeping the first", () => {
    expect(parseRegions("Goa, goa, GOA, Kerala, Goa")).toEqual([
      "Goa",
      "Kerala",
    ]);
  });

  it("returns nothing for an empty field", () => {
    expect(parseRegions("")).toEqual([]);
    expect(parseRegions(" , ")).toEqual([]);
  });
});

describe("toUpdateBody", () => {
  it("maps complete values", () => {
    expect(toUpdateBody(VALID)).toEqual({
      legalName: "Skyline Aviation Private Limited",
      tradingName: "Skyline",
      registrationNumber: "U62100MH2015PTC123456",
      taxNumber: "27AAACS1234A1Z5",
      contactName: "Meera Nair",
      contactEmail: "meera@skyline.example",
      contactPhone: "+919876543210",
      businessAddress: {
        line1: "Hangar 4, Juhu Aerodrome",
        line2: null,
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400049",
        country: "IN",
      },
      serviceCategories: ["PRIVATE_CHARTER", "HELICOPTER"],
      operatingRegions: ["Maharashtra", "Goa"],
    });
  });

  it("sends empty optional text as null", () => {
    const body = toUpdateBody({
      ...VALID,
      tradingName: "  ",
      registrationNumber: "",
      taxNumber: "",
      contactPhone: "",
    });
    expect(body.tradingName).toBeNull();
    expect(body.registrationNumber).toBeNull();
    expect(body.taxNumber).toBeNull();
    expect(body.contactPhone).toBeNull();
  });

  it("sends an untouched address as null", () => {
    expect(
      toUpdateBody({ ...VALID, businessAddress: EMPTY_ADDRESS })
        .businessAddress,
    ).toBeNull();
  });

  it("trims text and upper-cases the country", () => {
    const body = toUpdateBody({
      ...VALID,
      legalName: "  Skyline Aviation  ",
      businessAddress: {
        ...VALID.businessAddress,
        line2: " Vile Parle ",
        country: "in",
      },
    });
    expect(body.legalName).toBe("Skyline Aviation");
    expect(body.businessAddress?.line2).toBe("Vile Parle");
    expect(body.businessAddress?.country).toBe("IN");
  });

  it("splits, trims and deduplicates regions", () => {
    expect(
      toUpdateBody({ ...VALID, operatingRegions: " Goa, Kerala ,goa,," })
        .operatingRegions,
    ).toEqual(["Goa", "Kerala"]);
    expect(
      toUpdateBody({ ...VALID, operatingRegions: "" }).operatingRegions,
    ).toEqual([]);
  });

  it("leaves the identity fields out once they are locked", () => {
    const body = toUpdateBody(VALID, { identityLocked: true });
    expect(body).not.toHaveProperty("legalName");
    expect(body).not.toHaveProperty("registrationNumber");
    expect(body).not.toHaveProperty("taxNumber");
    expect(body).not.toHaveProperty("tradingName");
    expect(body).not.toHaveProperty("serviceCategories");
    expect(body.contactName).toBe("Meera Nair");
  });
});

describe("toFormValues", () => {
  const profile: OperatorProfile = {
    id: "0b4c7f3e-5a0e-4f0e-9a51-0f8f5f1f2a11",
    status: "DRAFT",
    legalName: "Skyline Aviation Private Limited",
    tradingName: null,
    registrationNumber: null,
    taxNumber: null,
    businessAddress: null,
    billingAddress: null,
    contactName: "Meera Nair",
    contactEmail: "meera@skyline.example",
    contactPhone: null,
    serviceCategories: [],
    operatingRegions: [],
    submittedAt: null,
    reviewedAt: null,
    reviewNote: null,
    missing: ["registrationNumber"],
  };

  it("shows nulls as empty fields and defaults the country to IN", () => {
    const values = toFormValues(profile);
    expect(values.tradingName).toBe("");
    expect(values.contactPhone).toBe("");
    expect(values.businessAddress).toEqual(EMPTY_ADDRESS);
    expect(values.operatingRegions).toBe("");
    expect(companyDetailsSchema.safeParse(values).success).toBe(true);
  });

  it("round-trips a saved profile through the form", () => {
    const saved: OperatorProfile = {
      ...profile,
      tradingName: "Skyline",
      businessAddress: { ...VALID.businessAddress, line2: null },
      serviceCategories: ["HELICOPTER"],
      operatingRegions: ["Maharashtra", "Goa"],
    };
    const body = toUpdateBody(toFormValues(saved));
    expect(body.businessAddress).toEqual(saved.businessAddress);
    expect(body.operatingRegions).toEqual(saved.operatingRegions);
    expect(body.serviceCategories).toEqual(saved.serviceCategories);
    expect(body.registrationNumber).toBeNull();
  });
});

describe("missing", () => {
  it("puts each known requirement in plain language", () => {
    expect(
      missingChecklist([
        "registrationNumber",
        "businessAddress",
        "serviceCategories",
        "document:AOC",
        "document:INSURANCE",
      ]),
    ).toEqual([
      "Add your company registration number",
      "Add your business address",
      "Choose at least one service you offer",
      "Upload your air operator certificate",
      "Upload your insurance certificate",
    ]);
  });

  it("still says something useful for a requirement it does not know", () => {
    expect(missingLabel("document:REGISTRATION")).toBe(
      "Upload this document: Company registration",
    );
    expect(missingLabel("billingAddress")).toBe(
      "Complete this detail: billingAddress",
    );
    expect(missingLabel("toString")).toBe("Complete this detail: toString");
  });

  it("does not repeat an item", () => {
    expect(missingChecklist(["document:AOC", "document:AOC"])).toEqual([
      "Upload your air operator certificate",
    ]);
  });

  it("allows submitting only a complete draft or rejected application", () => {
    expect(canSubmit({ status: "DRAFT", missing: [] })).toBe(true);
    expect(canSubmit({ status: "REJECTED", missing: [] })).toBe(true);
    expect(canSubmit({ status: "DRAFT", missing: ["document:AOC"] })).toBe(
      false,
    );
    for (const status of ["PENDING_REVIEW", "APPROVED", "SUSPENDED"]) {
      expect(canSubmit({ status, missing: [] })).toBe(false);
    }
  });
});

describe("fileProblem", () => {
  it("accepts PDF, JPEG and PNG up to 10 MB", () => {
    expect(fileProblem({ type: "application/pdf", size: 1024 })).toBeNull();
    expect(fileProblem({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(
      fileProblem({ type: "image/png", size: MAX_UPLOAD_BYTES }),
    ).toBeNull();
  });

  it("rejects other types, empty files and files over 10 MB", () => {
    expect(fileProblem({ type: "text/plain", size: 10 })).toBe(
      "Choose a PDF, JPEG or PNG file.",
    );
    expect(fileProblem({ type: "application/pdf", size: 0 })).toBe(
      "This file is empty. Choose another file.",
    );
    expect(
      fileProblem({ type: "application/pdf", size: MAX_UPLOAD_BYTES + 1 }),
    ).toBe("This file is larger than 10 MB. Choose a smaller file.");
  });
});

describe("formatDay", () => {
  it("formats a calendar date without shifting it across time zones", () => {
    expect(formatDay("2030-12-31")).toBe("31 Dec 2030");
    expect(formatDay("2030-12-31T00:00:00.000Z")).toBe("31 Dec 2030");
  });

  it("shows a value it cannot read as it is", () => {
    expect(formatDay("soon")).toBe("soon");
  });
});
