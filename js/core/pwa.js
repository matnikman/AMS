/* ============================================================
   AMS — PWA helper
   Registers the service worker, handles install prompt,
   and exposes a small API for the settings UI.
   ============================================================ */

import { toastSuccess, toastInfo } from "./toast.js";

/* ------------------------------------------------------------
   State
   ------------------------------------------------------------ */

let deferredPrompt = null;
let swRegistration = null;

const listeners = new Set();

/* ------------------------------------------------------------
   Service Worker registration
   ------------------------------------------------------------ */

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("[PWA] Service Worker not supported.");
    return null;
  }

  const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "[::1]";

  if (location.protocol !== "https:" && !isLocalhost) {
    console.warn("[PWA] Service Worker requires HTTPS or localhost.");
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register("./service-worker.js", {
      scope: "./",
    });
    console.log("[PWA] Service Worker registered:", swRegistration.scope);

    swRegistration.addEventListener("updatefound", () => {
      const installing = swRegistration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          toastInfo("نسخهٔ جدید در دسترسه. برای اعمال، برنامه رو ببند و باز کن.");
        }
      });
    });

    return swRegistration;
  } catch (err) {
    console.error("[PWA] Service Worker registration failed:", err);
    return null;
  }
}

/* ------------------------------------------------------------
   Install prompt
   ------------------------------------------------------------ */

export function listenForInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("[PWA] Install prompt captured.");
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    console.log("[PWA] App installed.");
    deferredPrompt = null;
    notifyListeners();
    toastSuccess("برنامه نصب شد!");
  });

  if (isStandalone()) {
    deferredPrompt = null;
    notifyListeners();
  }
}

/* ------------------------------------------------------------
   Public API
   ------------------------------------------------------------ */

export function isStandalone() {
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  if (window.navigator.standalone === true) return true;
  return false;
}

export function canInstall() {
  return !!deferredPrompt && !isStandalone();
}

export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";

  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  notifyListeners();

  promptEvent.prompt();

  const choice = await promptEvent.userChoice;
  console.log("[PWA] Install choice:", choice.outcome);
  return choice.outcome;
}

export function isServiceWorkerReady() {
  return !!(swRegistration && swRegistration.active);
}

export function isOfflineCapable() {
  return isServiceWorkerReady();
}

/* ------------------------------------------------------------
   Listeners
   ------------------------------------------------------------ */

export function onPwaStateChange(fn) {
  if (typeof fn === "function") listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  for (const fn of listeners) {
    try {
      fn();
    } catch (err) {
      console.error("[PWA] Listener error:", err);
    }
  }
}

/* ------------------------------------------------------------
   Auto-init
   ------------------------------------------------------------ */

export async function initPwa() {
  listenForInstallPrompt();
  await registerServiceWorker();

  /* Single re-check after a delay (NOT multiple — prevents re-render loops) */
  setTimeout(notifyListeners, 2500);
}