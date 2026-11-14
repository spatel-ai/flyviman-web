import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TravellerPicker } from "./traveller-picker";

function Harness() {
  const [count, setCount] = useState(2);
  return <TravellerPicker value={count} onChange={setCount} />;
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

afterEach(() => vi.unstubAllGlobals());

describe("TravellerPicker", () => {
  it("opens with focus on its heading, not on a control", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Travellers/ }));

    expect(await screen.findByText("Passengers")).toHaveFocus();
    // The keyboard reaches the stepper next.
    await user.tab();
    expect(
      screen.getByRole("button", { name: "One fewer passenger" }),
    ).toHaveFocus();
  });

  it("stops at one passenger and says how many", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Travellers/ }));
    const fewer = await screen.findByRole("button", {
      name: "One fewer passenger",
    });
    await user.click(fewer);
    expect(fewer).toBeDisabled();
    expect(
      screen.getByRole("status", { name: "Passengers" }),
    ).toHaveTextContent("1");
    expect(
      screen.getByRole("button", { name: /Travellers/ }),
    ).toHaveTextContent("1 passenger");
  });
});
