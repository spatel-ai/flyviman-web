import { IntroScript, IntroSeen } from "./intro-seen";

/**
 * The home page's opening (motion-design.md, Intro): a hairline is drawn
 * across the screen and the page opens from it. CSS only (`.intro-curtain`
 * in globals.css), so it cannot wait on JavaScript or get stuck; about a
 * second and a half, once per browser session, and absent under reduced
 * motion and in print. It never takes clicks.
 */
export function Intro() {
  return (
    <>
      <IntroScript />
      <div aria-hidden="true" className="intro-curtain">
        <div className="intro-curtain__line" />
      </div>
      <IntroSeen />
    </>
  );
}
