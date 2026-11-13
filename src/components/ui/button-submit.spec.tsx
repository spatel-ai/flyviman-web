import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

// D-095: a form must never be sent by the browser itself before React has
// taken over, or its fields land in the URL.
describe("submit buttons before the page is interactive", () => {
  it("a submit button is disabled in the server-rendered HTML", () => {
    expect(renderToString(<Button type="submit">Sign in</Button>)).toMatch(
      /<button[^>]*disabled=""/,
    );
  });

  it("other buttons are not", () => {
    expect(renderToString(<Button>Cancel</Button>)).not.toMatch(/disabled=""/);
  });

  it("a submit button works once the page is interactive", () => {
    render(<Button type="submit">Sign in</Button>);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("every submit button in the app is the shared Button", () => {
    const src = resolve(__dirname, "../..");
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return files(path);
        return /\.tsx$/.test(name) && !/\.spec\.tsx$/.test(name) ? [path] : [];
      });
    const raw = files(src).filter((path) =>
      /<button[^>]*type=["{]+submit/.test(readFileSync(path, "utf8")),
    );
    expect(
      raw,
      'use <Button type="submit"> from components/ui/button, which stays disabled until the page is interactive',
    ).toEqual([]);
  });
});
