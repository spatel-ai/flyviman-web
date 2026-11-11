export const THEME_STORAGE_KEY = "flyviman-theme";

// Runs before first paint so a stored choice never flashes the other theme.
// "system" (or nothing stored) leaves the attribute off and CSS follows the
// operating system.
const SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
