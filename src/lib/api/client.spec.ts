import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiUrl } from "./client";
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

describe("apiFetch session handling", () => {
  const ok = (data: unknown) =>
    new Response(JSON.stringify({ data, meta: { requestId: "r" } }), {
      status: 200,
    });
  const unauthenticated = () =>
    new Response(
      JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "x" } }),
      { status: 401 },
    );

  afterEach(() => {
    document.cookie = "csrf_token=; Max-Age=0";
    vi.unstubAllGlobals();
  });

  it("repeats the CSRF cookie in a header on state-changing requests only", async () => {
    document.cookie = "csrf_token=token-123";
    const fetchMock = vi.fn<
      (url: string, init: RequestInit) => Promise<Response>
    >(async () => ok({}));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("me");
    await apiFetch("me", { method: "PATCH", body: { firstName: "Asha" } });

    const headers = fetchMock.mock.calls.map(
      ([, init]) => init.headers as Record<string, string>,
    );
    expect(headers[0]["X-CSRF-Token"]).toBeUndefined();
    expect(headers[1]["X-CSRF-Token"]).toBe("token-123");
  });

  it("refreshes the session once on a 401 and repeats the request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(ok({ id: "1" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("me")).resolves.toMatchObject({ data: { id: "1" } });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringMatching(/\/me$/),
      expect.stringMatching(/\/auth\/refresh$/),
      expect.stringMatching(/\/me$/),
    ]);
  });

  it("shares one refresh between requests that fail together", async () => {
    let refreshes = 0;
    let refreshed = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        refreshes += 1;
        refreshed = true;
        return new Response(null, { status: 204 });
      }
      return refreshed ? ok({}) : unauthenticated();
    });
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([apiFetch("me"), apiFetch("me/passengers")]);
    expect(refreshes).toBe(1);
  });

  it("gives up with the 401 when the session cannot be refreshed", async () => {
    const fetchMock = vi.fn(async () => unauthenticated());
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("me")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    // The request, one refresh attempt, and two repeats (the second after
    // a short wait, in case a competing refresh's cookies were on their way).
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("repeats the request when its refresh lost a race with another one", async () => {
    // Another refresher (the web server, or another tab) has already set
    // new cookies, so this refresh is refused but the repeat succeeds.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(ok({ id: "1" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("me")).resolves.toMatchObject({ data: { id: "1" } });
  });

  it("repeats once when the CSRF cookie changed while the request was sent", async () => {
    const csrfMismatch = () =>
      new Response(
        JSON.stringify({
          error: { code: "CSRF_TOKEN_INVALID", message: "Invalid CSRF token." },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(csrfMismatch())
      .mockResolvedValueOnce(ok({ id: "1" }))
      .mockResolvedValueOnce(csrfMismatch())
      .mockResolvedValueOnce(csrfMismatch());
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch("me", { method: "PATCH", body: {} }),
    ).resolves.toMatchObject({ data: { id: "1" } });
    // A mismatch that persists is returned, not retried for ever.
    await expect(
      apiFetch("me", { method: "PATCH", body: {} }),
    ).rejects.toMatchObject({ status: 403, code: "CSRF_TOKEN_INVALID" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("waits and repeats once more when the new cookies arrive late", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(ok({ id: "1" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("me")).resolves.toMatchObject({ data: { id: "1" } });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does not try to refresh for a failed sign-in", async () => {
    const fetchMock = vi.fn(async () => unauthenticated());
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch("auth/login", { method: "POST", body: {} }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("leaves empty values out of the query string", () => {
    expect(apiUrl("admin/users", { q: "", page: 2, role: undefined })).toMatch(
      /\/admin\/users\?page=2$/,
    );
  });
});
