import type { Page } from "@playwright/test";

/**
 * Waits until no finite animation or transition is running, so axe measures
 * the settled colours. Endless ones (a hero's slow drift) are left out.
 */
export async function waitForAnimations(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getComputedTiming().endTime === Infinity,
      ),
  );
}

/** Runs the given axe rules on the page as it is now; returns the failures. */
export async function axeViolations(page: Page, rules: string[]) {
  await page.addScriptTag({ path: require.resolve("axe-core") });
  return page.evaluate(async (ruleIds) => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: unknown,
            options: unknown,
          ) => Promise<{
            violations: { id: string; nodes: { target: unknown[] }[] }[];
          }>;
        };
      }
    ).axe;
    // The footer wordmark is a decorative watermark that fades in on scroll.
    const result = await axe.run(
      { exclude: [[".site-footer__wordmark"]] },
      { runOnly: { type: "rule", values: ruleIds } },
    );
    return result.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => String(node.target)),
    }));
  }, rules);
}
