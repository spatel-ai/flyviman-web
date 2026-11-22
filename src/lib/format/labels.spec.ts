import { describe, expect, it } from "vitest";
import { channelLabel, serviceLabel } from "./labels";

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
