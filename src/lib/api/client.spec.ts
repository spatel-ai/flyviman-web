import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client";
import { ApiError } from "./errors";

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("unwraps the success envelope and sends cookies", async () => {
    const fetchMock = respond(200, {
      data: { status: "ok" },
      meta: { requestId: "req-1" },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ status: string }>("/health");

    expect(result).toEqual({
      data: { status: "ok" },
      meta: { requestId: "req-1" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/health",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("sends a body as JSON", async () => {
    const fetchMock = respond(201, { data: {}, meta: { requestId: null } });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("bookings", { method: "POST", body: { a: 1 } });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("throws ApiError carrying the API's code and details", async () => {
    vi.stubGlobal(
      "fetch",
      respond(409, {
        error: {
          code: "BOOKING_PRICE_CHANGED",
          message: "The price has changed.",
          details: [{ field: "totalMinor", issue: "changed" }],
          requestId: "req-2",
        },
      }),
    );

    const error = await apiFetch("bookings").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "BOOKING_PRICE_CHANGED",
      details: [{ field: "totalMinor", issue: "changed" }],
      requestId: "req-2",
    });
  });

  it("reports a network failure as NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(apiFetch("health")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });
});
