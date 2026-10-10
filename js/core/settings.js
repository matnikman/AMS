/* ============================================================
   AMS — User settings
   ============================================================ */

import * as storage from "./storage.js";

const SETTINGS_KEY = "settings";

export const VALID_THEMES = ["light", "dark", "gray", "eye"];
export const VALID_WEEK_DISPLAY = ["number", "date", "both"];
export const VALID_DIGIT_STYLES = ["fa", "en"];

export const DEFAULT_SETTINGS = {
  theme: "light",
  fontScale: 1.0,
  digitStyle: "fa",
  hideSupportTab: false,
  saveFolder: "AMS-Backups",
  folderHandle: null,
  weekDisplay: "number",
};

let current = { ...DEFAULT_SETTINGS };

export function loadSettings() {
  const stored = storage.load(SETTINGS_KEY, {});
  current = { ...DEFAULT_SETTINGS, ...stored };
  return { ...current };
}

export function getSettings() {
  return { ...current };
}

export function get(key) {
  return current[key];
}

export function updateSettings(patch) {
  const next = { ...current, ...patch };
  const sanitized = sanitize(next);
  current = sanitized;
  storage.save(SETTINGS_KEY, sanitized);
  return { ...current };
}

export function resetSettings() {
  current = { ...DEFAULT_SETTINGS };
  storage.save(SETTINGS_KEY, current);
  return { ...current };
}

function sanitize(s) {
  const out = { ...s };

  if (!VALID_THEMES.includes(out.theme)) out.theme = DEFAULT_SETTINGS.theme;

  let scale = Number(out.fontScale);
  if (!Number.isFinite(scale)) scale = DEFAULT_SETTINGS.fontScale;
  scale = Math.min(1.5, Math.max(0.8, scale));
  out.fontScale = scale;

  if (!VALID_DIGIT_STYLES.includes(out.digitStyle)) {
    out.digitStyle = DEFAULT_SETTINGS.digitStyle;
  }

  out.hideSupportTab = !!out.hideSupportTab;

  if (typeof out.saveFolder !== "string" || !out.saveFolder.trim()) {
    out.saveFolder = DEFAULT_SETTINGS.saveFolder;
  }

  if (!VALID_WEEK_DISPLAY.includes(out.weekDisplay)) {
    out.weekDisplay = DEFAULT_SETTINGS.weekDisplay;
  }

  return out;
}