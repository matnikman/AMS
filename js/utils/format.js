/* ============================================================
   AMS — Formatting helpers
   Strings, times, names, and display values.
   ============================================================ */

import { fa } from "../core/numbers.js";

/**
 * Join name parts with a space, skipping empties.
 * Example: fullName("محمدامین", "ابراهیمی") -> "محمدامین ابراهیمی"
 */
export function fullName(first, last) {
  return [first, last].filter(Boolean).join(" ").trim();
}

/**
 * Format a time range.
 * Example: formatTimeRange("17:00", "20:00") -> "۱۷:۰۰ تا ۲۰:۰۰"
 */
export function formatTimeRange(from, to) {
  if (!from && !to) return "";
  if (from && !to) return fa(from);
  if (!from && to) return fa(to);
  return `${fa(from)} تا ${fa(to)}`;
}

/**
 * Format minutes as "ساعت و دقیقه" in Persian.
 * Example: formatDuration(95) -> "۱ ساعت و ۳۵ دقیقه"
 */
export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
  if (h) parts.push(`${fa(h)} ساعت`);
  if (m) parts.push(`${fa(m)} دقیقه`);
  return parts.join(" و ") || "۰ دقیقه";
}

/**
 * Truncate long text with an ellipsis.
 */
export function truncate(text, max = 30) {
  if (typeof text !== "string") return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Convert attendance status code to its Persian label.
 * Used in tables and summaries.
 */
const STATUS_LABELS = {
  present: "حاضر",
  absent: "غایب",
  late: "تأخیر",
  excused: "مرخصی",
};

const STATUS_SYMBOLS = {
  present: "✓",
  absent: "✗",
  late: "ت",
  excused: "م",
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || "";
}

export function statusSymbol(status) {
  return STATUS_SYMBOLS[status] || "";
}

export const VALID_STATUSES = Object.keys(STATUS_LABELS);

/**
 * Compute attendance percentage for a student across all weeks.
 * @param {object} attendanceMap — { [week]: { [studentId]: status } }
 * @param {string} studentId
 * @param {number} totalWeeks
 */
export function attendancePercent(attendanceMap, studentId, totalWeeks) {
  if (!attendanceMap || !studentId || !totalWeeks) return 0;
  let presentCount = 0;
  for (let w = 1; w <= totalWeeks; w++) {
    const s = attendanceMap[w]?.[studentId];
    if (s === "present" || s === "late") presentCount++;
  }
  return Math.round((presentCount / totalWeeks) * 100);
}

/**
 * Format a number as a percentage string with Persian digits.
 */
export function formatPercent(value) {
  if (!Number.isFinite(value)) return "";
  return `${fa(value)}٪`;
}

/**
 * Format an ISO timestamp as Persian date+time.
 * Example: formatTimestamp("2025-01-01T10:30:00Z")
 */
export function formatTimestamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return fa(`${yyyy}/${mm}/${dd} — ${hh}:${mi}`);
}