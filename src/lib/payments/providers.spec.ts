import { afterEach, describe, expect, it } from "vitest";
import type { Me } from "@/lib/api/types";
import {
  checkoutKind,
  loadRazorpay,
  RAZORPAY_CHECKOUT_JS,
  razorpayPrefill,
} from "./providers";

const scripts = () =>
  [...document.querySelectorAll("script")].filter(
    (script) => script.src === RAZORPAY_CHECKOUT_JS,
  );

afterEach(() => {
  for (const script of scripts()) script.remove();
});

describe("checkoutKind", () => {
  it("opens the mock only where the test checkout is allowed", () => {
    expect(checkoutKind("mock", true)).toBe("mock");
    expect(checkoutKind("mock", false)).toBeNull();
  });

  it("opens Razorpay for Razorpay, and nothing for an unknown gateway", () => {
    expect(checkoutKind("razorpay", false)).toBe("razorpay");
    expect(checkoutKind("stripe", true)).toBeNull();
    expect(checkoutKind("", true)).toBeNull();
  });
});

describe("loadRazorpay", () => {
  it("adds Razorpay's script only when called, and only once", () => {
    expect(scripts()).toHaveLength(0);
    void loadRazorpay().catch(() => undefined);
    void loadRazorpay().catch(() => undefined);
    expect(scripts()).toHaveLength(1);
    expect(RAZORPAY_CHECKOUT_JS).toBe(
      "https://checkout.razorpay.com/v1/checkout.js",
    );
  });
});

describe("razorpayPrefill", () => {
  const me: Me = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "asha@example.com",
    phone: "+919876543210",
    role: "CUSTOMER",
    status: "ACTIVE",
    profile: {
      firstName: "Asha",
      lastName: "Rao",
      dateOfBirth: null,
      nationality: null,
    },
  };

  it("passes the customer's own name, email and phone to the checkout", () => {
    expect(razorpayPrefill(me)).toEqual({
      name: "Asha Rao",
      email: "asha@example.com",
      contact: "+919876543210",
    });
  });

  it("leaves out what is not on file: no phone, no contact", () => {
    expect(razorpayPrefill({ ...me, phone: null })).toEqual({
      name: "Asha Rao",
      email: "asha@example.com",
    });
    expect(razorpayPrefill({ ...me, profile: null, email: null })).toEqual({
      contact: "+919876543210",
    });
    expect(razorpayPrefill(undefined)).toEqual({});
  });
});
