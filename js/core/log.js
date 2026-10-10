/* ============================================================
   AMS — Bug log
   Collects errors/warnings in memory and persists the last N.
   Supports exporting as .txt for debugging.
   ============================================================ */

import * as storage from "./storage.js";

const LOG_KEY = "buglog";
const MAX_ENTRIES = 100;

/** In-memory log array. */
let entries = [];

/**
 * Load persisted entries on boot.
 */
export function loadLog() {
  entries = storage.load(LOG_KEY, []);
  if (!Array.isArray(entries)) entries = [];
  return entries.length;
}

/**
 * Append a log entry.
 * @param {"error"|"warn"|"info"} level
 * @param {string} message
 * @param {object} [meta]
 */
export function logEntry(level, message, meta = null) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message: String(message),
    meta: meta ? safeSerialize(meta) : null,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(-MAX_ENTRIES);
  }
  storage.save(LOG_KEY, entries);
}

export function logError(message, meta) {
  logEntry("error", message, meta);
}

export function logWarn(message, meta) {
  logEntry("warn", message, meta);
}

export function logInfo(message, meta) {
  logEntry("info", message, meta);
}

/**
 * Return a copy of all entries.
 */
export function getEntries() {
  return entries.map((e) => ({ ...e }));
}

/**
 * Clear the log.
 */
export function clearLog() {
  entries = [];
  storage.save(LOG_KEY, entries);
}

/**
 * Download the log as a .txt file.
 */
export function downloadLog() {
  const text = formatEntries(entries);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `ams-buglog-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Pretty-format entries for the text file.
 */
function formatEntries(list) {
  if (!list.length) return "AMS bug log — empty\n";
  const lines = ["AMS bug log", "=".repeat(40), ""];
  for (const e of list) {
    lines.push(`[${e.time}] ${e.level.toUpperCase()}`);
    lines.push(`  ${e.message}`);
    if (e.meta) lines.push(`  meta: ${e.meta}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Safely stringify anything for storage.
 */
function safeSerialize(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return "[unserializable]";
  }
}

/**
 * Attach global error handlers so nothing is missed.
 * Call once on boot.
 */
export function installGlobalHandlers() {
  window.addEventListener("error", (e) => {
    logError(e.message || "Unknown error", {
      file: e.filename,
      line: e.lineno,
      col: e.colno,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    logError("Unhandled promise rejection", {
      reason: String(e.reason),
    });
  });
}