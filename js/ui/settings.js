/* ============================================================
   AMS — Settings tab
   Theme, font, number format, PWA install, support tab, backup,
   bug log, danger zone, about.
   ============================================================ */

import {
  getSettings,
  updateSettings,
  resetSettings,
} from "../core/settings.js";
import { initTheme } from "../core/theme-boot.js";
import * as store from "../data/store.js";
import * as log from "../core/log.js";
import * as storage from "../core/storage.js";
import * as pwa from "../core/pwa.js";
import { toastSuccess, toastError } from "../core/toast.js";
import { confirmModal } from "./modal.js";
import { fa } from "../core/numbers.js";
import { buildThemePicker } from "./themePicker.js";
import { setSupportTabHidden } from "./tabs.js";

/* ------------------------------------------------------------
   Render
   ------------------------------------------------------------ */

export function renderSettings() {
  const panel = document.getElementById("tab-settings");
  if (!panel) return;

  panel.innerHTML = "";

  panel.appendChild(buildPwaSection());
  panel.appendChild(buildSupportSettingsSection());
  panel.appendChild(buildAppearanceSection());
  panel.appendChild(buildNumberFormatSection());
  panel.appendChild(buildBackupSection());
  panel.appendChild(buildLogSection());
  panel.appendChild(buildDangerSection());
  panel.appendChild(buildAboutSection());
}

/* ------------------------------------------------------------
   Support tab settings
   ------------------------------------------------------------ */

function buildSupportSettingsSection() {
  const card = document.createElement("div");
  card.className = "card";

  const hidden = getSettings().hideSupportTab;

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h3 class="card__title">💛 تب حمایت</h3>
        <div class="card__subtitle">
          ${
            hidden
              ? "تب حمایت الان از نوار بالا پنهانه."
              : "تب حمایت تو نوار بالا نمایش داده می‌شه."
          }
        </div>
      </div>
    </div>
    <div class="btn-row">
      ${
        hidden
          ? `<button class="btn btn--primary" data-action="show-support">نمایش مجدد تب</button>`
          : `<button class="btn btn--primary" data-action="open-support">رفتن به تب حمایت</button>
             <button class="btn btn--ghost" data-action="hide-support">پنهان کردن تب</button>`
      }
    </div>
  `;

  const showBtn = card.querySelector('[data-action="show-support"]');
  if (showBtn) {
    showBtn.addEventListener("click", () => {
      setSupportTabHidden(false);
      toastSuccess("تب حمایت نمایش داده شد");
      renderSettings();
    });
  }

  const openBtn = card.querySelector('[data-action="open-support"]');
  if (openBtn) {
    openBtn.addEventListener("click", async () => {
      const { setTab } = await import("./tabs.js");
      setTab("support");
    });
  }

  const hideBtn = card.querySelector('[data-action="hide-support"]');
  if (hideBtn) {
    hideBtn.addEventListener("click", () => {
      setSupportTabHidden(true);
      toastSuccess("تب پنهان شد");
      renderSettings();
    });
  }

  return card;
}

/* ------------------------------------------------------------
   PWA install
   ------------------------------------------------------------ */

function buildPwaSection() {
  const card = document.createElement("div");
  card.className = "card";

  const installed = pwa.isStandalone();
  const canInstall = pwa.canInstall();
  const offlineReady = pwa.isOfflineCapable();

  let bodyHtml = "";

  if (installed) {
    bodyHtml = `
      <div class="pwa-status pwa-status--ok" data-status="installed">
        <span class="pwa-status__icon">✅</span>
        <div>
          <div class="pwa-status__title">برنامه نصب شده</div>
          <div class="pwa-status__hint">در حال اجرا به‌عنوان برنامهٔ مستقل.</div>
        </div>
      </div>
      <div class="pwa-status pwa-status--${offlineReady ? "ok" : "warn"}" data-status="offline">
        <span class="pwa-status__icon">${offlineReady ? "📴" : "⏳"}</span>
        <div>
          <div class="pwa-status__title">${offlineReady ? "آمادهٔ آفلاین" : "در حال آماده‌سازی آفلاین"}</div>
          <div class="pwa-status__hint">
            ${
              offlineReady
                ? "همهٔ فایل‌ها ذخیره شدن. حتی بدون اینترنت کار می‌کنه."
                : "کمی صبر کن تا همهٔ فایل‌ها cache بشن."
            }
          </div>
        </div>
      </div>
    `;
  } else if (canInstall) {
    bodyHtml = `
      <p class="card__subtitle" style="margin-bottom:14px">
        این برنامه رو می‌تونی روی گوشی یا کامپیوتر نصب کنی و آفلاین استفاده کنی.
      </p>
      <div class="btn-row">
        <button class="btn btn--primary" data-action="install">
          📱 نصب روی دستگاه
        </button>
      </div>
      <div class="pwa-status pwa-status--${offlineReady ? "ok" : "warn"}" data-status="offline" style="margin-top:14px">
        <span class="pwa-status__icon">${offlineReady ? "📴" : "⏳"}</span>
        <div>
          <div class="pwa-status__title">${offlineReady ? "آمادهٔ آفلاین" : "در حال آماده‌سازی آفلاین"}</div>
          <div class="pwa-status__hint">
            ${
              offlineReady
                ? "حتی بدون نصب، می‌تونی آفلاین کار کنی."
                : "کمی صبر کن."
            }
          </div>
        </div>
      </div>
    `;
  } else {
    bodyHtml = `
      <p class="card__subtitle" style="margin-bottom:14px">
        نصب خودکار توسط مرورگر ارائه نشد. معمولاً وقتی برنامه از HTTPS اجرا بشه
        یا توسط مرورگر پشتیبانی بشه، فعال می‌شه.
      </p>
      <div class="pwa-status pwa-status--${offlineReady ? "ok" : "warn"}" data-status="offline">
        <span class="pwa-status__icon">${offlineReady ? "📴" : "⏳"}</span>
        <div>
          <div class="pwa-status__title">${offlineReady ? "آمادهٔ آفلاین" : "در حال آماده‌سازی آفلاین"}</div>
          <div class="pwa-status__hint">
            ${
              offlineReady
                ? "همهٔ فایل‌ها cache شدن."
                : "کمی صبر کن."
            }
          </div>
        </div>
      </div>
      <details class="pwa-hint" style="margin-top:12px">
        <summary>چطور دستی نصب کنم؟</summary>
        <ul>
          <li><strong>Android / Chrome:</strong> منوی مرورگر → «افزودن به صفحهٔ اصلی» یا «نصب برنامه»</li>
          <li><strong>iOS / Safari:</strong> دکمهٔ Share → «Add to Home Screen»</li>
          <li><strong>Desktop Chrome/Edge:</strong> آیکون نصب در نوار آدرس</li>
        </ul>
      </details>
    `;
  }

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h3 class="card__title">📱 نصب و آفلاین</h3>
        <div class="card__subtitle">برنامه رو روی دستگاه نصب کن و آفلاین استفاده کن.</div>
      </div>
    </div>
    ${bodyHtml}
  `;

  const installBtn = card.querySelector('[data-action="install"]');
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      const result = await pwa.promptInstall();
      if (result === "accepted") {
        toastSuccess("نصب شروع شد!");
      } else if (result === "dismissed") {
        toastError("نصب لغو شد.");
      } else {
        toastError("نصب در دسترس نیست.");
      }
      renderSettings();
    });
  }

  /* --------------------------------------------------------
     PWA state listener — updates ONLY the offline status box,
     NOT the whole settings tab (avoids infinite re-render loops).
     -------------------------------------------------------- */
  let pwaUnsubscribe = null;

  const updateOfflineBox = () => {
    if (!document.body.contains(card)) return;

    const offlineBox = card.querySelector('[data-status="offline"]');
    if (!offlineBox) return;

    const offlineReady = pwa.isOfflineCapable();

    const icon = offlineBox.querySelector(".pwa-status__icon");
    const title = offlineBox.querySelector(".pwa-status__title");
    const hint = offlineBox.querySelector(".pwa-status__hint");

    if (icon) icon.textContent = offlineReady ? "📴" : "⏳";
    if (title) {
      title.textContent = offlineReady
        ? "آمادهٔ آفلاین"
        : "در حال آماده‌سازی آفلاین";
    }
    if (hint) {
      hint.textContent = offlineReady
        ? "همهٔ فایل‌ها ذخیره شدن. حتی بدون اینترنت کار می‌کنه."
        : "کمی صبر کن تا همهٔ فایل‌ها cache بشن.";
    }

    /* Update class names */
    if (offlineReady) {
      offlineBox.classList.remove("pwa-status--warn");
      offlineBox.classList.add("pwa-status--ok");
    } else {
      offlineBox.classList.remove("pwa-status--ok");
      offlineBox.classList.add("pwa-status--warn");
    }
  };

  pwaUnsubscribe = pwa.onPwaStateChange(updateOfflineBox);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(card)) {
      if (pwaUnsubscribe) {
        pwaUnsubscribe();
        pwaUnsubscribe = null;
      }
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return card;
}

/* ------------------------------------------------------------
   Appearance: theme + font
   ------------------------------------------------------------ */

function buildAppearanceSection() {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h3 class="card__title">🎨 ظاهر</h3>
        <div class="card__subtitle">تم و اندازهٔ فونت رو اینجا تنظیم کن.</div>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-label">تم</div>
      <div data-theme-picker></div>
    </div>
    <div class="settings-section">
      <div class="settings-label">
        اندازهٔ فونت
        <span data-font-value class="settings-value">${fa(Math.round(getSettings().fontScale * 100))}٪</span>
      </div>
      <input type="range" min="0.8" max="1.5" step="0.05"
             value="${getSettings().fontScale}"
             data-font-range
             class="settings-range" />
      <div class="settings-range-labels">
        <span>کوچک</span>
        <span>معمولی</span>
        <span>بزرگ</span>
      </div>
    </div>
  `;

  const themeSlot = card.querySelector("[data-theme-picker]");
  themeSlot.appendChild(buildThemePicker());

  const range = card.querySelector("[data-font-range]");
  const valueLabel = card.querySelector("[data-font-value]");

  range.addEventListener("input", () => {
    const v = Number(range.value);
    valueLabel.textContent = fa(Math.round(v * 100)) + "٪";
    document.documentElement.style.setProperty("--font-scale", v);
  });

  range.addEventListener("change", () => {
    const v = Number(range.value);
    updateSettings({ fontScale: v });
    toastSuccess("اندازهٔ فونت ذخیره شد");
  });

  return card;
}

/* ------------------------------------------------------------
   Number format
   ------------------------------------------------------------ */

function buildNumberFormatSection() {
  const card = document.createElement("div");
  card.className = "card";

  const current = getSettings().digitStyle || "fa";

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h3 class="card__title">🔢 اعداد</h3>
        <div class="card__subtitle">
          انتخاب کن اعداد به فارسی (۱۲۳) نمایش داده بشن یا لاتین (123).
        </div>
      </div>
    </div>

    <div class="digit-style-picker">
      <button class="digit-style-card ${current === "fa" ? "digit-style-card--active" : ""}"
              data-style="fa" type="button">
        <div class="digit-style-card__preview digit-style-card__preview--fa">۱۲۳۴۵۶۷۸۹۰</div>
        <div class="digit-style-card__label">فارسی</div>
      </button>
      <button class="digit-style-card ${current === "en" ? "digit-style-card--active" : ""}"
              data-style="en" type="button">
        <div class="digit-style-card__preview digit-style-card__preview--en">1234567890</div>
        <div class="digit-style-card__label">لاتین (انگلیسی)</div>
      </button>
    </div>

    <div class="settings-hint">
      این تنظیم روی نمایش اعداد در جدول‌ها، مودال‌ها، و گزارش‌ها اثر می‌ذاره.
      داده‌های ذخیره‌شده همیشه لاتین هستن.
    </div>
  `;

  card.querySelectorAll("[data-style]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const style = btn.dataset.style;
      updateSettings({ digitStyle: style });
      document.documentElement.setAttribute("data-digits", style);
      toastSuccess(
        style === "fa" ? "اعداد فارسی فعال شد" : "اعداد لاتین فعال شد"
      );
      renderSettings();
    });
  });

  return card;
}

/* ------------------------------------------------------------
   Backup
   ------------------------------------------------------------ */

function buildBackupSection() {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h3 class="card__title">💾 پشتیبان‌گیری</h3>
        <div class="card__subtitle">از اطلاعاتت یه نسخهٔ JSON بگیر یا برگردون.</div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn--primary" data-action="export">📥 دانلود پشتیبان (JSON)</button>
      <button class="btn" data-action="import">📤 بازیابی از فایل</button>
    </div>
    <input type="file" accept=".json,application/json" hidden data-import />
    <div data-import-preview></div>
  `;

  card.querySelector('[data-action="export"]').addEventListener("click", () => {
    exportBackup();
  });

  const importInput = card.querySelector("[data-import]");
  card.querySelector('[data-action="import"]').addEventListener("click", () => {
    importInput.click();
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    importInput.value = "";
    if (!file) return;
    handleImportFile(file, card);
  });

  return card;
}

function exportBackup() {
  const data = store.exportAll();
  data.buglog = log.getEntries();
  data.exported_from = "AMS";

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `ams-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  const stats = store.getStats();
  toastSuccess(
    `پشتیبان دانلود شد (${fa(stats.students)} دانشجو، ${fa(stats.courses)} کلاس)`
  );
}

async function handleImportFile(file, card) {
  const preview = card.querySelector("[data-import-preview]");

  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch (err) {
    toastError("فایل JSON نامعتبر است.");
    return;
  }

  const stats = {
    students: (data.students || []).length,
    courses: (data.courses || []).length,
    enrollments: (data.enrollments || []).length,
  };

  preview.innerHTML = `
    <div class="import-summary">
      <div class="import-summary__title">محتوای فایل:</div>
      <div class="import-summary__items">
        <span>👥 ${fa(stats.students)} دانشجو</span>
        <span>📚 ${fa(stats.courses)} کلاس</span>
        <span>🔗 ${fa(stats.enrollments)} ثبت‌نام</span>
      </div>
      <div class="import-summary__actions">
        <button class="btn" data-action="cancel-import">انصراف</button>
        <button class="btn" data-action="merge-import">ادغام با داده‌های فعلی</button>
        <button class="btn btn--danger" data-action="replace-import">جایگزین کامل</button>
      </div>
    </div>
  `;

  preview
    .querySelector('[data-action="cancel-import"]')
    .addEventListener("click", () => {
      preview.innerHTML = "";
    });

  preview
    .querySelector('[data-action="merge-import"]')
    .addEventListener("click", async () => {
      try {
        const result = store.importAll(data, "merge");
        toastSuccess(
          `ادغام شد: ${fa(result.students)} دانشجوی جدید، ${fa(result.courses)} کلاس جدید`
        );
        preview.innerHTML = "";
        const { renderCourseList } = await import("./courseList.js");
        renderCourseList();
      } catch (err) {
        toastError(err.message || "خطا در ادغام");
      }
    });

  preview
    .querySelector('[data-action="replace-import"]')
    .addEventListener("click", async () => {
      const ok = await confirmModal({
        title: "جایگزین کامل",
        message:
          "همهٔ داده‌های فعلی پاک می‌شن و فقط داده‌های این فایل باقی می‌مونه. " +
          "بعد از این کار، صفحه به‌طور خودکار رفرش می‌شه. مطمئنی؟",
        confirmText: "جایگزین کن",
        cancelText: "انصراف",
      });
      if (!ok) return;

      try {
        store.importAll(data, "replace");
        if (data.settings) updateSettings(data.settings);
        if (data.settings?.theme) initTheme(data.settings.theme);
        if (data.settings?.digitStyle) {
          document.documentElement.setAttribute("data-digits", data.settings.digitStyle);
        }
        try {
          storage.remove("active_tab");
        } catch {}
        toastSuccess("داده‌ها جایگزین شد. در حال بارگذاری مجدد...");
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        toastError(err.message || "خطا در بازیابی");
      }
    });
}

/* ------------------------------------------------------------
   Bug log
   ------------------------------------------------------------ */

function buildLogSection() {
  const card = document.createElement("div");
  card.className = "card";

  const count = log.getEntries().length;

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h3 class="card__title">📋 گزارش خطاها</h3>
        <div class="card__subtitle">
          ${count ? `${fa(count)} خطای ثبت‌شده` : "هیچ خطایی ثبت نشده"}
        </div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn" data-action="download" ${count ? "" : "disabled"}>
        📥 دانلود گزارش
      </button>
      <button class="btn" data-action="clear" ${count ? "" : "disabled"}>
        🗑️ پاک کردن
      </button>
    </div>
  `;

  card.querySelector('[data-action="download"]').addEventListener("click", () => {
    log.downloadLog();
    toastSuccess("گزارش دانلود شد");
  });

  card
    .querySelector('[data-action="clear"]')
    .addEventListener("click", async () => {
      const ok = await confirmModal({
        title: "پاک کردن گزارش",
        message: "همهٔ خطاهای ثبت‌شده پاک می‌شن. مطمئنی؟",
        confirmText: "پاک کن",
        cancelText: "انصراف",
      });
      if (!ok) return;
      log.clearLog();
      toastSuccess("گزارش پاک شد");
      renderSettings();
    });

  return card;
}

/* ------------------------------------------------------------
   Danger zone
   ------------------------------------------------------------ */

function buildDangerSection() {
  const card = document.createElement("div");
  card.className = "card card--danger";

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h3 class="card__title">⚠️ منطقهٔ خطر</h3>
        <div class="card__subtitle">این عملیات برگشت‌ناپذیرن.</div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn--danger" data-action="clear-data">
        پاک کردن همهٔ داده‌های کلاس‌ها و دانشجوها
      </button>
      <button class="btn btn--danger" data-action="factory-reset">
        بازگشت به تنظیمات کارخانه
      </button>
    </div>
  `;

  card
    .querySelector('[data-action="clear-data"]')
    .addEventListener("click", async () => {
      const ok = await confirmModal({
        title: "پاک کردن داده‌ها",
        message:
          "همهٔ کلاس‌ها، دانشجوها، ثبت‌نام‌ها، حضور و نمرات پاک می‌شن. " +
          "ولی تنظیمات و گزارش خطاها باقی می‌مونن. مطمئنی؟",
        confirmText: "پاک کن",
        cancelText: "انصراف",
      });
      if (!ok) return;
      store.clearAllData();
      toastSuccess("همهٔ داده‌ها پاک شد");
      renderSettings();
    });

  card
    .querySelector('[data-action="factory-reset"]')
    .addEventListener("click", async () => {
      const ok = await confirmModal({
        title: "بازگشت به تنظیمات کارخانه",
        message:
          "همه‌چیز پاک می‌شه: کلاس‌ها، دانشجوها، تنظیمات، گزارش خطاها. " +
          "انگار که برنامه رو تازه نصب کردی. مطمئنی؟",
        confirmText: "همه رو پاک کن",
        cancelText: "انصراف",
      });
      if (!ok) return;
      storage.clearAll();
      resetSettings();
      toastSuccess("برنامه به حالت اول برگشت");
      setTimeout(() => location.reload(), 800);
    });

  return card;
}

/* ------------------------------------------------------------
   About
   ------------------------------------------------------------ */

function buildAboutSection() {
  const card = document.createElement("div");
  card.className = "card";

  const version = window.AMS?.version || "3.0.0";

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h3 class="card__title">ℹ️ دربارهٔ برنامه</h3>
        <div class="card__subtitle">سامانهٔ حضور و غیاب دانشگاهی</div>
      </div>
    </div>
    <div class="about-grid">
      <div><strong>نسخه:</strong> ${escapeHtml(version)}</div>
      <div><strong>ذخیره‌سازی:</strong> localStorage (مرورگر)</div>
      <div><strong>خواندن PDF:</strong> PDF.js (Mozilla)</div>
      <div><strong>فونت:</strong> وزیرمتن</div>
    </div>
  `;

  return card;
}

/* ------------------------------------------------------------
   Utilities
   ------------------------------------------------------------ */

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}