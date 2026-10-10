/* ============================================================
   AMS — Jalali (Solar Hijri) calendar utilities
   Convert between Gregorian and Jalali, format dates, weekday names.
   Pure JS — no dependencies.
   ============================================================ */

import { fa, faPad } from "../core/numbers.js";

/* Persian month names, index 0 = Farvardin */
export const MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند",
];

/* Persian weekday names, index 0 = Saturday (first day of week in Iran) */
export const WEEKDAY_NAMES = [
  "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه",
  "چهارشنبه", "پنجشنبه", "جمعه",
];

/**
 * Convert Gregorian (year, month, day) to Jalali.
 * Based on the well-known algorithm by Borkowski.
 * @returns {{ jy: number, jm: number, jd: number }}
 */
export function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

/**
 * Convert Jalali (year, month, day) to Gregorian.
 * @returns {{ gy: number, gm: number, gd: number }}
 */
export function jalaliToGregorian(jy, jm, jd) {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return { gy, gm, gd };
}

/**
 * Convert a JS Date to Jalali parts.
 */
export function dateToJalali(date) {
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Convert Jalali parts to a JS Date (local time, midnight).
 */
export function jalaliToDate(jy, jm, jd) {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd);
}

/**
 * Format a Jalali date as Persian text.
 * @param {{jy:number,jm:number,jd:number}|Date} input
 * @param {"short"|"long"|"numeric"} [style]
 */
export function formatJalali(input, style = "numeric") {
  const { jy, jm, jd } = input instanceof Date ? dateToJalali(input) : input;
  const monthName = MONTH_NAMES[jm - 1] || "";
  switch (style) {
    case "long":
      return `${fa(jd)} ${monthName} ${fa(jy)}`;
    case "short":
      return `${monthName} ${fa(jy)}`;
    case "numeric":
    default:
      return `${fa(jy)}/${faPad(jm, 2)}/${faPad(jd, 2)}`;
  }
}

/**
 * Get the Persian weekday name for a JS Date.
 * Iran week starts on Saturday.
 */
export function getWeekdayName(date) {
  const jsDay = date.getDay(); // 0=Sun .. 6=Sat
  const idx = (jsDay + 1) % 7; // 0=Sat .. 6=Fri
  return WEEKDAY_NAMES[idx];
}

/**
 * Today's Jalali date, formatted.
 */
export function todayJalali(style = "numeric") {
  return formatJalali(dateToJalali(new Date()), style);
}

/**
 * Parse a Jalali numeric string "1404/08/15" into parts.
 * Returns null if invalid.
 */
export function parseJalaliNumeric(str) {
  if (typeof str !== "string") return null;
  const cleaned = str.trim().replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const m = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  return { jy, jm, jd };
}

/**
 * Add days to a JS Date, returns a new Date.
 */
export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}