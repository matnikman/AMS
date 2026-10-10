/* ============================================================
   AMS — Entry point
   Phase R7: + PWA (offline + installable)
   ============================================================ */

import { initTheme } from "./core/theme-boot.js";
import { loadSettings, getSettings, updateSettings } from "./core/settings.js";
import { loadLog, installGlobalHandlers, logInfo } from "./core/log.js";
import { toastSuccess } from "./core/toast.js";
import { fa } from "./core/numbers.js";
import * as storage from "./core/storage.js";
import * as log from "./core/log.js";
import * as numbers from "./core/numbers.js";
import * as grades from "./core/grades.js";
import * as jalali from "./utils/jalali.js";
import * as format from "./utils/format.js";
import * as store from "./data/store.js";
import * as pwa from "./core/pwa.js";

import { initTabs, setTab, onTabChange } from "./ui/tabs.js";
import { renderCourseList } from "./ui/courseList.js";
import { renderCurrentTab } from "./ui/currentTab.js";
import { renderSettings } from "./ui/settings.js";
import { renderStudents } from "./ui/studentsTab.js";
import { renderSupport } from "./ui/supportTab.js";

import "./import/pdfDebug.js";

const PROJECT_NAME = "AMS — Attendance Management System";
const VERSION = "3.0.0-phaseR7";

function boot() {
  console.log(`${PROJECT_NAME} | v${VERSION}`);

  installGlobalHandlers();
  loadLog();

  const settings = loadSettings();
  initTheme(settings.theme);
  document.documentElement.style.setProperty("--font-scale", settings.fontScale);
  document.documentElement.setAttribute("data-digits", settings.digitStyle || "fa");

  logInfo("App booted", { version: VERSION });

  initTabs();
  renderCourseList();

  onTabChange((name) => {
    if (name === "current") renderCurrentTab();
    if (name === "settings") renderSettings();
    if (name === "students") renderStudents();
    if (name === "support") renderSupport();
  });

  exposeDebugAPI();

  /* PWA — after a short delay so the UI is up */
  setTimeout(() => {
    pwa.initPwa().catch((err) => console.warn("[PWA] init failed:", err));
  }, 500);

  document.documentElement.setAttribute("data-ready", "true");
  console.log("Phase R7 ready. PWA initialized.");
}

function exposeDebugAPI() {
  window.AMS = window.AMS || {};

  Object.assign(window.AMS, {
    version: VERSION,
    settings: { get: getSettings, update: updateSettings },
    storage,
    log,
    numbers,
    fa,
    jalali,
    format,
    grades,
    store,
    pwa,
    toast: toastSuccess,
    ui: { setTab },

    help() {
      console.log(
        "%c AMS Debug API ",
        "background:#2c6bed;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px"
      );
      console.log(`
Core:
  AMS.settings.get()
  AMS.storage.keys()
  AMS.store.getStats()
  AMS.fa(12345)
  AMS.toast('تست')

Store:
  AMS.store.loadStudents()
  AMS.store.loadCourses()
  AMS.store.loadEnrollments()
  AMS.store.upsertStudent({num, first, last})
  AMS.store.studentsInCourse(courseId)
  AMS.store.coursesForStudent(studentId)
  AMS.store.clearAllData()

PWA:
  AMS.pwa.isStandalone()      // آيا نصب شده؟
  AMS.pwa.canInstall()        // آيا ميشه نصب کرد؟
  AMS.pwa.promptInstall()     // باز کردن پنجره نصب
  AMS.pwa.isOfflineCapable()  // آيا آفلاین کار ميکنه؟

UI:
  AMS.ui.setTab('courses')

PDF:
  const i = document.createElement('input');
  i.type = 'file'; i.accept = 'application/pdf';
  i.onchange = () => AMS.pdfDebug(i.files[0]);
  i.click();
      `);
    },
  });

  console.log(
    "%c AMS Debug API ready. Type AMS.help() ",
    "background:#2e9e4f;color:#fff;padding:2px 6px;border-radius:3px"
  );
}

document.addEventListener("DOMContentLoaded", boot);