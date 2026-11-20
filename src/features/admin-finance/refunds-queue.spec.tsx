import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import { RefundsQueue } from "./refunds-queue";

type Init = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};
let posts: { path: string; init: Init }[] = [];
let lists = 0;
let refuse: ApiError | null = null;
vi.mock("@/lib/api/client", () => ({
  apiFetch: async (path: string, init: Init = {}) => {
    if (init.method === "POST") {
      posts.push({ path, init });
      if (refuse) throw refuse;
      return { data: {} };
    }
    lists += 1;
    return {
      data: [
        {
          bookingReference: "FLY-BK-1",
          paymentReference: "FLY-PY-1",
          amountMinor: 2_500_000,
          currency: "INR",
          status: "REFUND_DUE",
          dueSince: "2099-01-01T00:00:00.000Z",
        },
        {
          bookingReference: "FLY-BK-2",
          paymentReference: "FLY-PY-2",
          amountMinor: 100_000,
          currency: "INR",
          status: "REFUND_PENDING",
          dueSince: "2099-01-02T00:00:00.000Z",
        },
      ],
      meta: { page: 1, pageSize: 20, total: 2 },
    };
  },
  apiUrl: (path: string) => path,
}));

function show() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ToastProvider>
        <RefundsQueue />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  posts = [];
  lists = 0;
  refuse = null;
});

async function start(reason: string) {
  await userEvent.click(
    await screen.findByRole("button", { name: "Start refund for FLY-BK-1" }),
  );
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument();
  const confirm = within(dialog).getByRole("button", { name: "Start refund" });
  expect(confirm).toBeDisabled();
  if (reason)
    await userEvent.type(within(dialog).getByLabelText("Reason"), reason);
  return { dialog, confirm };
}

describe("RefundsQueue", () => {
  it("offers to start only refunds that are due", async () => {
    show();
    expect(
      await screen.findByRole("button", { name: "Start refund for FLY-BK-1" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start refund for FLY-BK-2" }),
    ).not.toBeInTheDocument();
  });

  it("needs a reason, then starts the refund once with an Idempotency-Key", async () => {
    show();
    const { confirm } = await start("Cancelled by the customer in time");
    await userEvent.click(confirm);
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].path).toBe("admin/payments/FLY-PY-1/refunds");
    expect(posts[0].init.body).toEqual({
      amountMinor: 2_500_000,
      currency: "INR",
      reason: "Cancelled by the customer in time",
    });
    expect(posts[0].init.headers?.["Idempotency-Key"]).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(lists).toBe(2));
  });

  it("shows a refusal on the page and reloads the queue", async () => {
    refuse = new ApiError(409, "CONFLICT", "Already refunded.");
    show();
    const { confirm } = await start("Duplicate request");
    await userEvent.click(confirm);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Already refunded.",
    );
    await waitFor(() => expect(lists).toBe(2));
  });
});
