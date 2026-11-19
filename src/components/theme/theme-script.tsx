export const THEME_STORAGE_KEY = "flyviman-theme";

// Runs before first paint so a stored choice never flashes the other theme.
// Light is the default: only a stored "dark" selects dark; nothing, "light"
// and the retired "system" all read as light.
// Listed in INLINE_SCRIPTS (lib/inline-scripts.ts) for a nonce-based
// Content-Security-Policy.
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
