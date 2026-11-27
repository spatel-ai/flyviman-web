import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useUnsavedChangesWarning } from "./use-unsaved-changes-warning";

function unload(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("useUnsavedChangesWarning", () => {
  it("asks the browser to confirm only while the form is dirty", () => {
    const { rerender, unmount } = renderHook(
      ({ dirty }) => useUnsavedChangesWarning(dirty),
      { initialProps: { dirty: false } },
    );
    expect(unload()).toBe(false);
    rerender({ dirty: true });
    expect(unload()).toBe(true);
    rerender({ dirty: false });
    expect(unload()).toBe(false);
    rerender({ dirty: true });
    unmount();
    expect(unload()).toBe(false);
  });
});
