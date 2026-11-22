import { describe, expect, it } from "vitest";
import { channelLabel, roleLabel, serviceLabel } from "./labels";

describe("serviceLabel", () => {
  it("names services and reads an unknown one as words", () => {
    expect(serviceLabel("PRIVATE_CHARTER")).toBe("Private charter");
    expect(serviceLabel("toString")).toBe("Tostring");
    expect(serviceLabel("CARGO_FLIGHT")).toBe("Cargo flight");
  });
});

describe("channelLabel", () => {
  it("names channels and reads an unknown one as words", () => {
    expect(channelLabel("EMAIL")).toBe("Email");
    expect(channelLabel("SMS")).toBe("SMS");
    expect(channelLabel("WHATSAPP_BUSINESS")).toBe("Whatsapp business");
  });
});

describe("roleLabel", () => {
  it("names roles and reads an unknown one as words", () => {
    expect(roleLabel("OPERATOR_ADMIN")).toBe("Operator administrator");
    expect(roleLabel("SUPER_ADMIN")).toBe("Super administrator");
    expect(roleLabel("OPS")).toBe("Operations");
    expect(roleLabel("NEW_ROLE")).toBe("New role");
  });
});
