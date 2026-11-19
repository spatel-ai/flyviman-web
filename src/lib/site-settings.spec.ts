import { describe, expect, it, vi } from "vitest";
import { parseSiteSettings } from "./site-settings";

describe("parseSiteSettings", () => {
  it("shows nothing optional when unset, and keeps the contact defaults", () => {
    const warn = vi.fn();
    const s = parseSiteSettings({ whatsappNumber: "  ", social: {} }, warn);
    expect(s.whatsappHref).toBeUndefined();
    expect(s.social).toEqual([]);
    expect(s.logoPath).toBeUndefined();
    expect(s.email).toBe("info@flyviman.com");
    expect(s.phones).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it("accepts valid values", () => {
    const s = parseSiteSettings({
      whatsappNumber: "+91 97799 20011",
      social: {
        instagram: "https://www.instagram.com/flyviman",
        x: "https://x.com/f",
      },
      logoPath: "/brand/logo.svg",
      email: "hello@flyviman.com",
      phones: "+91 97799 20011, +44 20 7946 0958",
    });
    expect(s.whatsappHref).toBe("https://wa.me/919779920011");
    expect(s.social.map((n) => n.network)).toEqual(["instagram", "x"]);
    expect(s.logoPath).toBe("/brand/logo.svg");
    expect(s.email).toBe("hello@flyviman.com");
    expect(s.phones[1]).toEqual({
      label: "+44 20 7946 0958",
      href: "tel:+442079460958",
    });
  });

  it("ignores invalid values with a warning", () => {
    const warn = vi.fn();
    const s = parseSiteSettings(
      {
        whatsappNumber: "call me",
        social: {
          instagram: "http://insecure.com/x",
          facebook: "javascript:alert(1)",
        },
        logoPath: "//evil.com/a.png",
        email: "nope",
        phones: "123",
      },
      warn,
    );
    expect(s.whatsappHref).toBeUndefined();
    expect(s.social).toEqual([]);
    expect(s.logoPath).toBeUndefined();
    expect(s.email).toBe("info@flyviman.com");
    expect(s.phones).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(6);
    expect(
      parseSiteSettings({ logoPath: "/a/../b.png" }).logoPath,
    ).toBeUndefined();
  });
});
