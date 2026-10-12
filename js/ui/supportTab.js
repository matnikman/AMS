/* ============================================================
   AMS — Support tab
   A warm message + Mahak charity link.
   Includes a toggle to hide the tab from the tab bar.
   ============================================================ */

import { getSettings } from "../core/settings.js";
import { setSupportTabHidden } from "./tabs.js";
import { toastSuccess } from "../core/toast.js";

const MAHAK_URL = "https://mahak-charity.org/online-payment/";

/* ------------------------------------------------------------
   Render
   ------------------------------------------------------------ */

export function renderSupport() {
  const panel = document.getElementById("tab-support");
  if (!panel) return;

  panel.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "support-wrap";

  /* Intro */
  wrap.appendChild(buildIntro());

  /* Mahak */
  wrap.appendChild(buildMahakBlock());

  /* Hide-tab toggle */
  wrap.appendChild(buildHideToggle());

  /* Footer */
  const footer = document.createElement("p");
  footer.className = "support-footer";
  footer.innerHTML = `ممنون که هستی 🌱 حتی اگه حمایت نکنی، همین که از برنامه استفاده می‌کنی برام ارزشمنده.`;
  wrap.appendChild(footer);

  panel.appendChild(wrap);
}

/* ------------------------------------------------------------
   Intro
   ------------------------------------------------------------ */

function buildIntro() {
  const div = document.createElement("div");
  div.className = "support-intro-block";

  div.innerHTML = `
    <h2 class="support-title">یه کوچولو حمایت، یه دنیا انرژی 💛</h2>
    <p class="support-intro">
      سلام رفیق! این برنامه رو با عشق ساختم و کلی وقت و انرژی براش گذاشتم.
      اگه دوست داری این مسیر ادامه پیدا کنه، می‌تونی ازم حمایت کنی.
      هر مبلغی، هر چقدر هم کوچیک، برام یه «دست‌مریزاد» بزرگه 🙏
    </p>
  `;

  return div;
}

/* ------------------------------------------------------------
   Mahak block
   ------------------------------------------------------------ */

function buildMahakBlock() {
  const block = document.createElement("div");
  block.className = "support-block support-block--mahak";

  block.innerHTML = `
    <div class="support-block__title">🎗️ و یه کار قشنگ‌تر…</div>
    <p class="support-mahak-text">
      اگه قراره پولی خرج بشه، بذار به جایی برسه که زندگی‌ها رو عوض می‌کنه:
      محک کنار بچه‌های سرطانیه که سخت‌ترین روزهاشون رو می‌گذرونن.
      یه لبخند روی صورت این بچه‌ها از هر چیزی باارزش‌تره.
    </p>
    <a class="btn support-btn support-btn--mahak"
       href="${MAHAK_URL}"
       target="_blank"
       rel="noopener noreferrer">
      🎗️ حمایت از کودکان سرطانی محک
    </a>
  `;

  return block;
}

/* ------------------------------------------------------------
   Hide-tab toggle
   ------------------------------------------------------------ */

function buildHideToggle() {
  const box = document.createElement("div");
  box.className = "support-hide-toggle";

  const checked = getSettings().hideSupportTab;

  box.innerHTML = `
    <label class="switch">
      <input type="checkbox" ${checked ? "checked" : ""} data-action="hide-toggle" />
      <span class="switch__slider"></span>
      <span class="switch__label">
        این تب رو تو نوار بالا نشون نده
        <small>بعداً از «تنظیمات» می‌تونی برگردونی.</small>
      </span>
    </label>
  `;

  box.querySelector("[data-action='hide-toggle']").addEventListener("change", (e) => {
    const hide = e.target.checked;
    setSupportTabHidden(hide);
    if (hide) {
      toastSuccess("تب از نوار پنهان شد. از تنظیمات می‌تونی برگردونی.");
    } else {
      toastSuccess("تب دوباره نمایش داده می‌شه.");
    }
    renderSupport();
  });

  return box;
}
