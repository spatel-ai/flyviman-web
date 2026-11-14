import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POPULAR_LOCATIONS } from "@/content/search";
import { ApiError } from "@/lib/api/errors";
import { AirportPicker } from "./airport-picker";

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ apiFetch }));

function renderPicker(onChange = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AirportPicker label="From" value="" onChange={onChange} />
    </QueryClientProvider>,
  );
  return { onChange };
}

function open() {
  fireEvent.click(screen.getByRole("button", { name: /From/ }));
}

beforeEach(() => {
  // Desktop: the picker opens as a popover.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal("scrollBy", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  apiFetch.mockReset();
});

describe("AirportPicker", () => {
  it("lists the popular airports even when the API cannot be reached", async () => {
    apiFetch.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Network error"),
    );
    renderPicker();
    open();

    const list = await screen.findByRole("listbox", {
      name: "Popular airports",
    });
    const options = list.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(POPULAR_LOCATIONS.length);
    expect(list).toHaveTextContent("Mumbai");
    expect(list).toHaveTextContent("BOM");
  });

  it("says so when a popular airport cannot be chosen because the API is down", async () => {
    apiFetch.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Network error"),
    );
    const { onChange } = renderPicker();
    open();
    fireEvent.click(await screen.findByRole("option", { name: /Mumbai/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't reach the server/,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("chooses a popular airport once its id is known", async () => {
    const mumbai = {
      id: "6b0c5c1e-0000-4000-8000-000000000001",
      iata: "BOM",
      icao: "VABB",
      name: "Chhatrapati Shivaji Maharaj International Airport",
      city: "Mumbai",
      type: "AIRPORT",
    };
    apiFetch.mockImplementation(
      async (_path: string, options?: { query?: { q?: string } }) => ({
        data: options?.query?.q === "BOM" ? [mumbai] : [],
        meta: { requestId: null },
      }),
    );
    const { onChange } = renderPicker();
    open();
    fireEvent.click(await screen.findByRole("option", { name: /Mumbai/ }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(mumbai.id));
  });
});
