import { act, render, screen } from "@testing-library/react";
import { Activity } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./reveal";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let callbacks: Callback[] = [];
let disconnects = 0;

class ObserverStub {
  constructor(callback: Callback) {
    callbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    disconnects += 1;
  }
}

function report(isIntersecting: boolean) {
  act(() => {
    for (const callback of callbacks) callback([{ isIntersecting }]);
  });
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
    })),
  );
}

/** Where the element's top edge sits, in a 800 px tall window. */
function placeAt(top: number) {
  vi.stubGlobal("innerHeight", 800);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top,
  } as DOMRect);
}

function section() {
  return screen.getByText("Section").closest("[data-reveal]")!;
}

beforeEach(() => {
  callbacks = [];
  disconnects = 0;
  vi.stubGlobal("IntersectionObserver", ObserverStub);
  stubReducedMotion(false);
  placeAt(1200);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Reveal", () => {
  it("is rendered visible on the server, so it shows without JavaScript", () => {
    expect(renderToString(<Reveal>Section</Reveal>)).toContain(
      'data-reveal="visible"',
    );
  });

  it("leaves content alone that is already on screen when the page loads", () => {
    placeAt(100);
    render(<Reveal>Section</Reveal>);
    expect(section()).toHaveAttribute("data-reveal", "visible");
    expect(callbacks).toHaveLength(0);
  });

  it("leaves content alone that is above the screen at load (a restored scroll)", () => {
    placeAt(-400);
    render(<Reveal>Section</Reveal>);
    expect(section()).toHaveAttribute("data-reveal", "visible");
  });

  it("leaves content alone that only just peeks onto the screen", () => {
    placeAt(790);
    render(<Reveal>Section</Reveal>);
    expect(section()).toHaveAttribute("data-reveal", "visible");
  });

  it("hides content below the screen, then reveals it once when scrolled to", () => {
    render(<Reveal>Section</Reveal>);
    expect(section()).toHaveAttribute("data-reveal", "waiting");

    report(false);
    expect(section()).toHaveAttribute("data-reveal", "waiting");

    report(true);
    expect(section()).toHaveAttribute("data-reveal", "shown");
    expect(disconnects).toBeGreaterThan(0);
  });

  it("shows content that was left waiting and is on screen when the page returns", () => {
    // A kept page: its state survives while it is hidden, its effects run
    // again when it is shown.
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <Reveal>Section</Reveal>
      </Activity>
    );
    const { rerender } = render(page("visible"));
    expect(section()).toHaveAttribute("data-reveal", "waiting");

    rerender(page("hidden"));
    placeAt(100);
    rerender(page("visible"));
    expect(section()).toHaveAttribute("data-reveal", "shown");
  });

  it("never hides anything under reduced motion", () => {
    stubReducedMotion(true);
    render(<Reveal>Section</Reveal>);
    expect(callbacks).toHaveLength(0);
    expect(section()).toHaveAttribute("data-reveal", "visible");
  });

  it("never hides anything without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Reveal>Section</Reveal>);
    expect(section()).toHaveAttribute("data-reveal", "visible");
  });

  it("staggers at most four items", () => {
    render(
      <>
        <Reveal index={2}>Second</Reveal>
        <Reveal index={9}>Too far</Reveal>
        <Reveal index={-1}>Negative</Reveal>
      </>,
    );
    const index = (text: string) =>
      (screen.getByText(text) as HTMLElement).style.getPropertyValue(
        "--reveal-index",
      );
    expect(index("Second")).toBe("2");
    expect(index("Too far")).toBe("3");
    expect(index("Negative")).toBe("0");
  });

  it("marks a slit reveal, and leaves an ordinary one unmarked", () => {
    render(
      <>
        <Reveal variant="slit">Section</Reveal>
        <Reveal>Plain</Reveal>
      </>,
    );
    expect(section()).toHaveAttribute("data-reveal-variant", "slit");
    expect(section()).toHaveAttribute("data-reveal", "waiting");
    expect(
      screen.getByText("Plain").closest("[data-reveal]"),
    ).not.toHaveAttribute("data-reveal-variant");
  });

  it("keeps the caller's attributes and styles", () => {
    render(
      <Reveal className="mt-4" style={{ color: "red" }} aria-label="Intro">
        Section
      </Reveal>,
    );
    expect(section()).toHaveClass("mt-4");
    expect(section()).toHaveAttribute("aria-label", "Intro");
    expect((section() as HTMLElement).style.color).toBe("red");
  });
});
