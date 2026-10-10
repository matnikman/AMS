/* ============================================================
   AMS — Grade management (session-based)
   Each grade record belongs to a session, a student, and has
   a title, a decimal value, and a date (auto-derived from session).
   ============================================================ */

import { fa } from "./numbers.js";

export const MIN_GRADE = 0;
export const MAX_GRADE = 20;

/* ------------------------------------------------------------
   Record creation
   ------------------------------------------------------------ */

/**
 * Create a new grade record.
 * @param {object} opts
 * @param {number} opts.session
 * @param {string} opts.student_id
 * @param {string} opts.title
 * @param {number|string} opts.value
 * @param {string} [opts.date] — auto-derived from session if omitted
 * @param {object} [opts.sessionDates] — { [session]: "1404/07/18" }
 */
export function createRecord({ session, student_id, title, value, date, sessionDates }) {
  return {
    id: `n${Date.now()}${Math.floor(Math.random() * 1000)}`,
    session: Number(session),
    student_id: String(student_id),
    title: String(title || "").trim(),
    value: parseGrade(value),
    date: date || resolveSessionDate(session, sessionDates),
  };
}

/**
 * Resolve the date for a session from the sessionDates map.
 * Returns "" if not found.
 */
export function resolveSessionDate(session, sessionDates) {
  if (!sessionDates) return "";
  return sessionDates[Number(session)] || "";
}

/* ------------------------------------------------------------
   Validation
   ------------------------------------------------------------ */

/**
 * Parse a raw grade value. Accepts Persian/Latin digits and decimals.
 * Returns null if empty/invalid; clamps to [0, 20] otherwise.
 */
export function parseGrade(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return clamp(raw);
  const cleaned = String(raw)
    .trim()
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/٫/g, ".")
    .replace(/,/g, ".");
  if (cleaned === "") return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return clamp(num);
}

function clamp(n) {
  if (n < MIN_GRADE) return MIN_GRADE;
  if (n > MAX_GRADE) return MAX_GRADE;
  return Math.round(n * 100) / 100;
}

/**
 * Validate a record before saving. Returns { ok, error }.
 */
export function validateRecord(rec) {
  if (!rec) return { ok: false, error: "رکورد خالیه." };
  if (!rec.student_id) return { ok: false, error: "دانشجو انتخاب نشده." };
  if (!Number.isFinite(rec.session) || rec.session < 1) {
    return { ok: false, error: "شمارهٔ جلسه نامعتبره." };
  }
  if (!rec.title) return { ok: false, error: "عنوان نمره خالیه." };
  if (rec.value === null || rec.value === undefined) {
    return { ok: false, error: "عدد نمره وارد نشده." };
  }
  return { ok: true };
}

/* ------------------------------------------------------------
   Query helpers — operate on a grades array
   ------------------------------------------------------------ */

/**
 * Return all records for a given student, sorted by session then date.
 */
export function recordsForStudent(grades, studentId) {
  if (!Array.isArray(grades)) return [];
  return grades
    .filter((g) => g.student_id === studentId)
    .sort((a, b) => a.session - b.session || a.id.localeCompare(b.id));
}

/**
 * Return all records for a given session, sorted by student_id.
 */
export function recordsForSession(grades, session) {
  if (!Array.isArray(grades)) return [];
  return grades
    .filter((g) => g.session === Number(session))
    .sort((a, b) => a.student_id.localeCompare(b.student_id));
}

/**
 * Return records for a student in a specific session.
 */
export function recordsForStudentInSession(grades, studentId, session) {
  return recordsForStudent(grades, studentId)
    .filter((g) => g.session === Number(session));
}

/**
 * Check if a student already has a grade with this title in this session.
 * Used to warn about duplicates.
 */
export function hasDuplicate(grades, studentId, session, title) {
  const t = String(title || "").trim();
  return recordsForStudentInSession(grades, studentId, session)
    .some((g) => g.title === t);
}

/* ------------------------------------------------------------
   Mutations — immutable, return a new array
   ------------------------------------------------------------ */

/**
 * Add a new record. Returns { grades, record } or { grades, error }.
 */
export function addRecord(grades, record) {
  const list = Array.isArray(grades) ? [...grades] : [];
  const check = validateRecord(record);
  if (!check.ok) return { grades: list, error: check.error };
  if (hasDuplicate(list, record.student_id, record.session, record.title)) {
    return { grades: list, error: "این نمره قبلاً برای این دانشجو ثبت شده." };
  }
  list.push(record);
  return { grades: list, record };
}

/**
 * Update an existing record by id.
 */
export function updateRecord(grades, id, patch) {
  const list = Array.isArray(grades) ? [...grades] : [];
  const idx = list.findIndex((g) => g.id === id);
  if (idx < 0) return { grades: list, error: "رکورد پیدا نشد." };
  const next = { ...list[idx], ...patch };
  if (patch.value !== undefined) next.value = parseGrade(patch.value);
  const check = validateRecord(next);
  if (!check.ok) return { grades: list, error: check.error };
  list[idx] = next;
  return { grades: list, record: next };
}

/**
 * Remove a record by id.
 */
export function removeRecord(grades, id) {
  if (!Array.isArray(grades)) return [];
  return grades.filter((g) => g.id !== id);
}

/* ------------------------------------------------------------
   Computation
   ------------------------------------------------------------ */

/**
 * Average of all grades for a student.
 */
export function studentAverage(grades, studentId) {
  const recs = recordsForStudent(grades, studentId);
  const values = recs.map((r) => r.value).filter((v) => typeof v === "number");
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

/**
 * Average across all students (only those with at least one grade).
 */
export function classAverage(grades) {
  if (!Array.isArray(grades) || !grades.length) return null;
  const byStudent = new Map();
  for (const g of grades) {
    if (typeof g.value !== "number") continue;
    if (!byStudent.has(g.student_id)) byStudent.set(g.student_id, []);
    byStudent.get(g.student_id).push(g.value);
  }
  if (!byStudent.size) return null;
  let total = 0;
  for (const values of byStudent.values()) {
    total += values.reduce((a, b) => a + b, 0) / values.length;
  }
  return Math.round((total / byStudent.size) * 100) / 100;
}

/**
 * Count how many grades a student has.
 */
export function gradeCount(grades, studentId) {
  return recordsForStudent(grades, studentId).length;
}

/* ------------------------------------------------------------
   Display
   ------------------------------------------------------------ */

/**
 * Format a grade value: Persian digits, trimmed trailing zeros.
 */
export function formatGrade(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const fixed = value.toFixed(2).replace(/\.?0+$/, "");
  return fa(fixed);
}

/**
 * Format a grade or a dash.
 */
export function formatGradeOrDash(value) {
  return formatGrade(value) || "—";
}

/**
 * Persian label for a grade.
 */
export function gradeStatus(value) {
  if (typeof value !== "number") return "";
  if (value >= 17) return "عالی";
  if (value >= 14) return "خوب";
  if (value >= 10) return "قبول";
  return "رد";
}
/* ------------------------------------------------------------
   Session / title helpers (added for design decisions 1ج و 2ج)
   ------------------------------------------------------------ */

/**
 * Suggest the next session number for a course.
 * Looks at existing grades and returns max(session) + 1.
 * Returns 1 if none exist yet.
 */
export function suggestNextSession(grades) {
  if (!Array.isArray(grades) || !grades.length) return 1;
  let max = 0;
  for (const g of grades) {
    if (Number.isFinite(g.session) && g.session > max) max = g.session;
  }
  return max + 1;
}

/**
 * Suggest a session date for a new session.
 * Prefers today's Jalali date (in Persian digits).
 * @param {function} todayFn — e.g. AMS.jalali.todayJalali
 */
export function suggestSessionDate(todayFn) {
  try {
    return typeof todayFn === "function" ? todayFn() : "";
  } catch {
    return "";
  }
}

/**
 * Return a de-duplicated list of titles used in this course,
 * sorted by frequency (most-used first), then alphabetically.
 * Used for the autocomplete dropdown.
 */
export function suggestTitles(grades) {
  if (!Array.isArray(grades) || !grades.length) return [];
  const counts = new Map();
  for (const g of grades) {
    const t = String(g.title || "").trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fa"))
    .map(([title]) => title);
}