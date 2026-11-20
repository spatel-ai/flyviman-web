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
let dueLists = 0;
let refuse: ApiError | null = null;
vi.mock("@/lib/api/client", () => ({
  apiFetch: async (path: string, init: Init = {}) => {
    if (init.method === "POST") {
      posts.push({ path, init });
      if (refuse) throw refuse;
      return { data: {} };
    }
    const meta = { page: 1, pageSize: 20, total: 1 };
    if (path === "admin/refunds") {
      return {
        data: [
          {
            reference: "FLY-RF-9",
            amountMinor: 50_000,
            currency: "INR",
            status: "COMPLETED",
            createdAt: "2099-01-03T00:00:00.000Z",
            updatedAt: "2099-01-03T00:00:00.000Z",
            paymentReference: "FLY-PY-9",
            bookingReference: "FLY-BK-9",
            reason: "Goodwill",
            paymentStatus: "PARTIALLY_REFUNDED",
            refundableMinor: 0,
          },
        ],
        meta,
      };
    }
    dueLists += 1;
    return {
      data: [
        {
          kind: "CANCELLATION",
          bookingReference: "FLY-BK-1",
          bookingStatus: "CANCELLED",
          bookingPaymentStatus: "PAID",
          paymentReference: "FLY-PY-1",
          paymentStatus: "SUCCEEDED",
          paymentAmountMinor: 5_000_000,
          refundableMinor: 5_000_000,
          dueMinor: 2_500_000,
          currency: "INR",
          since: "2099-01-01T00:00:00.000Z",
        },
      ],
      meta,
    };
  },
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
  dueLists = 0;
  refuse = null;
});

async function open() {
  await userEvent.click(
    await screen.findByRole("button", { name: "Refund FLY-BK-1" }),
  );
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument();
  expect(within(dialog).getByLabelText(/Amount to refund/)).toHaveValue(
    "25000",
  );
  return dialog;
}

describe("RefundsQueue", () => {
  it("needs a reason before it sends anything", async () => {
    show();
    const dialog = await open();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Refund" }),
    );
    expect(
      await within(dialog).findByText(/Give a reason/),
    ).toBeInTheDocument();
    expect(posts).toHaveLength(0);
  });

  it("refunds the amount due once, with an Idempotency-Key", async () => {
    show();
    const dialog = await open();
    await userEvent.type(
      within(dialog).getByLabelText("Reason"),
      "Cancelled by the customer in time",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Refund" }),
    );
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
    await waitFor(() => expect(dueLists).toBe(2));
  });

  it("shows a refusal in the form and reloads the queue", async () => {
    refuse = new ApiError(409, "REFUND_EXCEEDS_REMAINDER", "Too much.");
    show();
    const dialog = await open();
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Duplicate");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Refund" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      /more than is left to refund/,
    );
    await waitFor(() => expect(dueLists).toBe(2));
  });

  it("lists refunds already started under History", async () => {
    show();
    await userEvent.click(await screen.findByRole("tab", { name: "History" }));
    expect(await screen.findByText("FLY-BK-9")).toBeInTheDocument();
    expect(screen.getByText("Goodwill")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});
