import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PayDeadline } from "./pay-deadline";

const HOLD = new Date(Date.now() + 2 * 86_400_000).toISOString();

describe("PayDeadline", () => {
  it("shows the pay-by time while the booking awaits payment", () => {
    render(<PayDeadline holdExpiresAt={HOLD} status="AWAITING_PAYMENT" />);
    expect(screen.getByTestId("pay-deadline")).toHaveTextContent(/Pay by/);
  });

  it("shows nothing for a balance due on a confirmed booking", () => {
    render(<PayDeadline holdExpiresAt={HOLD} status="CONFIRMED" />);
    expect(screen.queryByTestId("pay-deadline")).toBeNull();
  });
});
