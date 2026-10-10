/* ============================================================
   AMS — Persian number utilities
   Respects the user's digitStyle setting ("fa" | "en").
   Never stores Persian digits — always convert at display time.
   ============================================================ */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/**
 * Read the current digit style.
 * Prefers the [data-digits] attribute on <html>, falls back to settings.
 */
function currentStyle() {
  try {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-digits");
      if (attr === "en" || attr === "fa") return attr;
    }
    const raw = localStorage.getItem("ams.settings");
    if (raw) {
      const s = JSON.parse(raw);
      if (s.digitStyle === "en") return "en";
      if (s.digitStyle === "fa") return "fa";
    }
  } catch {
    /* ignore */
  }
  return "fa";
}

/**
 * Convert all Latin digits in a string/number to Persian digits.
 * Returns the input unchanged if the user chose "en".
 * Example: fa(123) -> "۱۲۳" (or "123" if style is "en")
 */
export function fa(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (currentStyle() === "en") return s;
  return s.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * Convert Persian digits back to Latin. Useful for parsing input.
 */
export function toLatin(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[۰-۹]/g, (d) => {
    const idx = PERSIAN_DIGITS.indexOf(d);
    return idx >= 0 ? String(idx) : d;
  });
}

/**
 * Format an integer with thousand separators, then apply digit style.
 */
export function faNum(n) {
  if (!Number.isFinite(n)) return "";
  const withSep = n.toLocaleString("en-US");
  return fa(withSep);
}

/**
 * Pad a number to a fixed width, then apply digit style.
 */
export function faPad(n, width = 2) {
  return fa(String(n).padStart(width, "0"));
}

/**
 * Convert a decimal number without grouping.
 */
export function faDecimal(n) {
  if (!Number.isFinite(n)) return "";
  return fa(String(n));
}