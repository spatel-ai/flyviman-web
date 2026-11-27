import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tierLines } from "@/lib/cancellation-tiers";
import { CancellationTerms } from "./cancellation-terms";

const TIERS = [
  { minHoursBeforeDeparture: 72, chargePercent: 10 },
  { minHoursBeforeDeparture: 24, chargePercent: 50 },
  { minHoursBeforeDeparture: 0, chargePercent: 100 },
];
const SUMMARY = `Flyviman's cancellation terms, the same for every operator. ${tierLines(TIERS).join(". ")}. A charge is taken only from a confirmed price.`;

describe("CancellationTerms", () => {
  it("lists each tier as when and charge, keeping the summary's own wording around them", () => {
    render(<CancellationTerms summary={SUMMARY} charges={TIERS} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(tierLines(TIERS));
    expect(
      screen.getByText(
        "Flyviman's cancellation terms, the same for every operator.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("A charge is taken only from a confirmed price."),
    ).toBeVisible();
  });

  it("shows the summary alone when no tiers are known", () => {
    render(<CancellationTerms summary="Operator terms apply." charges={[]} />);
    expect(screen.getByText("Operator terms apply.")).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
