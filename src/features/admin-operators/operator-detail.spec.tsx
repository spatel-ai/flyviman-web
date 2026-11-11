import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Role, Schemas } from "@/lib/api/types";
import { OperatorDetail } from "./operator-detail";

vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn() }));
const api = vi.mocked(apiFetch);

const ID = "0b0f5c1e-1111-4222-8333-444455556666";

const operator: Schemas["AdminOperatorDetailDto"] = {
  id: ID,
  status: "PENDING_REVIEW",
  legalName: "Skyline Aviation Private Limited",
  tradingName: "Skyline",
  registrationNumber: "U62200MH2020PTC000001",
  taxNumber: null,
  businessAddress: {
    line1: "1 Marine Drive",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "IN",
  },
  billingAddress: null,
  contactName: "Meera Nair",
  contactEmail: "meera@skyline.example",
  contactPhone: null,
  serviceCategories: ["PRIVATE_CHARTER", "HELICOPTER"],
  operatingRegions: ["Maharashtra", "Goa"],
  submittedAt: "2026-11-10T09:30:00.000Z",
  reviewedAt: null,
  reviewNote: null,
  missing: ["document:INSURANCE"],
  reviewedById: null,
  createdAt: "2026-11-01T09:30:00.000Z",
  documents: [
    {
      id: "doc-1",
      type: "AOC",
      fileId: "file-1",
      fileName: "aoc.pdf",
      issuedAt: null,
      expiresAt: "2027-01-31",
      verificationStatus: "PENDING",
      verificationNote: null,
      createdAt: "2026-11-01T09:30:00.000Z",
    },
  ],
};

const ok = <T,>(data: T) => ({ data, meta: { requestId: null } });

function serve(
  role: Role,
  routes: Record<string, () => Promise<unknown>> = {},
  detail: () => Promise<unknown> = () => Promise.resolve(ok(operator)),
) {
  api.mockImplementation(((path: string) => {
    if (path === "me") return Promise.resolve(ok({ id: "me-1", role }));
    if (path === `admin/operators/${ID}`) return detail();
    const route = routes[path];
    if (route) return route();
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  }) as typeof apiFetch);
}

function setup() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ToastProvider>
        <OperatorDetail id={ID} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return user;
}

describe("OperatorDetail", () => {
  // Braces matter: a returned function would be run as a cleanup hook.
  beforeEach(() => {
    api.mockReset();
  });

  it("shows the company, what is missing and the documents", async () => {
    serve("OPS");
    setup();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Skyline Aviation Private Limited",
      }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-status="PENDING_REVIEW"]'),
    ).toHaveTextContent("Under review");
    expect(
      screen.getByText("1 Marine Drive, Mumbai, Maharashtra 400001, IN"),
    ).toBeInTheDocument();
    expect(screen.getByText("Private charter, Helicopter")).toBeInTheDocument();

    const missing = screen.getByRole("heading", {
      name: "What is still missing",
    });
    expect(
      within(missing.parentElement!).getByText("Insurance certificate"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Air operator certificate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Expires 31 Jan 2027")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to operators" }),
    ).toHaveAttribute("href", "/admin/operators");
  });

  it("gives a reviewer the decisions for an application under review", async () => {
    serve("OPS");
    setup();

    expect(
      await screen.findByRole("button", { name: "Approve" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reject application" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Verify / }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Reject Air/ }),
    ).toBeInTheDocument();
  });

  it("is read-only for finance, apart from opening documents", async () => {
    serve("FINANCE_ADMIN");
    setup();

    expect(
      await screen.findByRole("button", { name: /^Open / }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approve" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reject application" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Verify / }),
    ).not.toBeInTheDocument();
  });

  it("says to verify the documents when approval is refused for that", async () => {
    serve("SUPER_ADMIN", {
      [`admin/operators/${ID}/approve`]: () =>
        Promise.reject(new ApiError(422, "OPERATOR_DOCUMENTS_UNVERIFIED", "x")),
    });
    const user = setup();

    await user.click(await screen.findByRole("button", { name: "Approve" }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Approve this operator?" }),
      ).getByRole("button", { name: "Approve operator" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Verify the required documents first",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rejects an application with the reason and shows the new status", async () => {
    serve("OPS", {
      [`admin/operators/${ID}/reject`]: () =>
        Promise.resolve(
          ok({
            ...operator,
            status: "REJECTED",
            reviewNote: "Certificate expired",
          }),
        ),
    });
    const user = setup();

    await user.click(
      await screen.findByRole("button", { name: "Reject application" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Reject this application?",
    });
    const confirm = within(dialog).getByRole("button", {
      name: "Confirm rejection",
    });
    expect(confirm).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText("Reason"),
      "Certificate expired",
    );
    await user.click(confirm);

    expect(await screen.findByText("Application rejected")).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(`admin/operators/${ID}/reject`, {
      method: "POST",
      body: { reason: "Certificate expired" },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("verifies a document", async () => {
    serve("OPS", {
      "admin/documents/doc-1/verify": () =>
        Promise.resolve(
          ok({ ...operator.documents[0], verificationStatus: "VERIFIED" }),
        ),
    });
    const user = setup();

    await user.click(await screen.findByRole("button", { name: /^Verify / }));

    expect(await screen.findByText("Document verified")).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("admin/documents/doc-1/verify", {
      method: "POST",
      body: { decision: "VERIFIED" },
    });
  });

  it("shows a way back when the operator does not exist", async () => {
    serve("OPS", {}, () => Promise.reject(new ApiError(404, "NOT_FOUND", "x")));
    setup();

    expect(await screen.findByText("Operator not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to operators" }),
    ).toBeInTheDocument();
  });

  it("shows other failures inline with a retry", async () => {
    serve("OPS", {}, () =>
      Promise.reject(new ApiError(500, "INTERNAL_ERROR", "x")),
    );
    setup();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong on our side. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
