/**
 * Opens a short-lived link (a signed download URL) in a new tab.
 *
 * Call `reserveTab()` during the click, before waiting on the network:
 * browsers block a window opened after an await. Then hand the URL to the
 * returned function. Only http(s) URLs are followed, so a link can never
 * run script in a tab that belongs to this site.
 */
export function reserveTab(): {
  open: (url: string) => void;
  cancel: () => void;
} {
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  return {
    open(url) {
      let target: URL;
      try {
        target = new URL(url, window.location.href);
      } catch {
        tab?.close();
        throw new Error("The link is not valid.");
      }
      if (target.protocol !== "https:" && target.protocol !== "http:") {
        tab?.close();
        throw new Error("The link is not valid.");
      }
      if (tab) tab.location.replace(target.href);
      else window.open(target.href, "_blank", "noopener,noreferrer");
    },
    cancel() {
      tab?.close();
    },
  };
}
