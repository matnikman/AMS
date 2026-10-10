/* ============================================================
   AMS — Theme boot
   Sets data-theme on <html> and persists to localStorage.
   No events, no DOM rebuild — just sets the attribute.
   ============================================================ */

const THEME_KEY = "ams.theme";
const DEFAULT_THEME = "light";
const VALID_THEMES = ["light", "dark", "gray", "eye"];

function resolveTheme(explicit) {
  if (explicit && VALID_THEMES.includes(explicit)) return explicit;
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored && VALID_THEMES.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function initTheme(explicit) {
  const theme = resolveTheme(explicit);
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  /* No side effects. Just set the attribute. */
}