/* ============================================================
   AMS — Tab manager
   Persists active tab, supports a hideable support tab.
   ============================================================ */

import * as storage from "../core/storage.js";
import { getSettings, updateSettings } from "../core/settings.js";

const TAB_NAMES = ["students", "current", "courses", "settings", "support"];
const DEFAULT_TAB = "courses";
const STORAGE_KEY = "active_tab";

let activeTab = DEFAULT_TAB;
const listeners = new Set();

/* ------------------------------------------------------------
   Init
   ------------------------------------------------------------ */

export function initTabs() {
  /* Bind click handlers */
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  /* Apply support tab visibility */
  applySupportTabVisibility();

  /* Restore last active tab */
  let saved = storage.load(STORAGE_KEY, DEFAULT_TAB);

  /* If support tab is hidden and saved tab is support, fallback */
  if (saved === "support" && getSettings().hideSupportTab) {
    saved = "settings";
  }

  const initial = TAB_NAMES.includes(saved) ? saved : DEFAULT_TAB;
  setTab(initial);
}

/* ------------------------------------------------------------
   Tab switching
   ------------------------------------------------------------ */

export function setTab(name) {
  if (!TAB_NAMES.includes(name)) return;

  /* Prevent navigating to hidden support tab via direct calls */
  if (name === "support" && getSettings().hideSupportTab) return;

  activeTab = name;
  storage.save(STORAGE_KEY, name);

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("tab--active", btn.dataset.tab === name);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== `tab-${name}`;
  });

  for (const fn of listeners) {
    try {
      fn(name);
    } catch (e) {
      console.error(e);
    }
  }
}

export function getActiveTab() {
  return activeTab;
}

export function onTabChange(fn) {
  if (typeof fn === "function") listeners.add(fn);
}

/* ------------------------------------------------------------
   Support tab visibility
   ------------------------------------------------------------ */

/**
 * Show or hide the support tab in the tab bar.
 * Called on boot and whenever the setting changes.
 */
export function applySupportTabVisibility() {
  const tab = document.querySelector('.tab[data-tab="support"]');
  if (!tab) return;

  const hidden = getSettings().hideSupportTab;
  tab.hidden = hidden;
}

/**
 * Set the hideSupportTab setting and refresh the tab bar.
 * If the support tab becomes hidden while active, fallback to settings.
 */
export function setSupportTabHidden(hidden) {
  updateSettings({ hideSupportTab: !!hidden });
  applySupportTabVisibility();

  /* If we're currently on support and just hid it, go to settings */
  if (hidden && activeTab === "support") {
    setTab("settings");
  }
}