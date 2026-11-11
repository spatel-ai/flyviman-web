import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { AddStaffDialog } from "./add-staff-dialog";

vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn() }));
const api = vi.mocked(apiFetch);

function setup() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <AddStaffDialog />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return user;
}

async function fillAndSend(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Add staff account" }));
  await user.type(screen.getByLabelText("Email"), "ops.lead@flyviman.com");
  await user.click(screen.getByRole("combobox", { name: "Role" }));
  await user.click(screen.getByRole("option", { name: "Finance" }));
  await user.click(screen.getByRole("button", { name: "Send invitation" }));
}

describe("AddStaffDialog", () => {
  // Braces matter: a returned function would be run as a cleanup hook.
  beforeEach(() => {
    api.mockReset();
  });

  it("offers only the internal roles", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Add staff account" }));
    await user.click(screen.getByRole("combobox", { name: "Role" }));
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Operations", "Finance", "Super administrator"]);
  });

  it("asks for an email and a role before sending anything", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Add staff account" }));
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(screen.getByText("Choose a role.")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("creates the account, confirms and closes", async () => {
    api.mockResolvedValue({
      data: { email: "ops.lead@flyviman.com" },
      meta: { requestId: null },
    });
    const user = setup();
    await fillAndSend(user);

    expect(
      await screen.findByText("Invitation sent to ops.lead@flyviman.com"),
    ).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("admin/staff", {
      method: "POST",
      body: { email: "ops.lead@flyviman.com", role: "FINANCE_ADMIN" },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts an existing account under the email field and stays open", async () => {
    api.mockRejectedValue(
      new ApiError(409, "USER_ALREADY_EXISTS", "whatever the API says"),
    );
    const user = setup();
    await fillAndSend(user);

    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInvalid();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
