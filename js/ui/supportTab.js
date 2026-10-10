/* ============================================================
   AMS — Support tab
   A warm message + card number + Mahak charity link + contact.
   Includes a toggle to hide the tab from the tab bar.
   ============================================================ */

import { getSettings } from "../core/settings.js";
import { setSupportTabHidden } from "./tabs.js";
import { toastSuccess, toastInfo } from "../core/toast.js";

const CARD_NUMBER_DISPLAY = "6037-9919-4982-6758";
const CARD_NUMBER_RAW = "6037991949826758";
const CARD_HOLDER = "متین نیک منش";

const MAHAK_URL = "https://mahak-charity.org/online-payment/";

const PHONE_DISPLAY = "۰۹۱۶۷۸۲۷۵۴۱";
const PHONE_RAW = "09167827541";

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

  /* Card number */
  wrap.appendChild(buildCardBlock());

  /* Mahak */
  wrap.appendChild(buildMahakBlock());

  /* Contact */
  wrap.appendChild(buildContactBlock());

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
   Card number block
   ------------------------------------------------------------ */

function buildCardBlock() {
  const card = document.createElement("div");
  card.className = "support-block support-block--card";

  card.innerHTML = `
    <div class="support-block__title">💳 شماره کارت</div>
    <div class="support-line">
      <span class="support-line__value support-line__value--card" dir="ltr">
        ${CARD_NUMBER_DISPLAY}
      </span>
      <button class="btn btn--sm" data-action="copy-card">📋 کپی</button>
    </div>
    <div class="support-holder">
      به نام: <strong>${CARD_HOLDER}</strong>
    </div>
  `;

  card.querySelector('[data-action="copy-card"]').addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const ok = await copyToClipboard(CARD_NUMBER_RAW);
    if (ok) {
      toastSuccess("شماره کارت کپی شد");
      const old = btn.textContent;
      btn.textContent = "✓ کپی شد";
      setTimeout(() => (btn.textContent = old), 1800);
    } else {
      toastInfo("کپی نشد. دستی انتخاب کن.");
    }
  });

  return card;
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
   Contact block
   ------------------------------------------------------------ */

function buildContactBlock() {
  const card = document.createElement("div");
  card.className = "support-block support-block--contact";

  card.innerHTML = `
    <div class="support-block__title">📞 ارتباط و گزارش باگ</div>
    <div class="support-line">
      <a class="support-line__value support-line__value--phone" href="tel:${PHONE_RAW}" dir="ltr">
        ${PHONE_DISPLAY}
      </a>
      <button class="btn btn--sm" data-action="copy-phone">📋 کپی</button>
    </div>
    <div class="support-hint">
      اگه باگی دیدی، پیشنهادی داری، یا فقط می‌خوای سلام کنی — یه پیام بده.
    </div>
  `;

  card.querySelector('[data-action="copy-phone"]').addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const ok = await copyToClipboard(PHONE_RAW);
    if (ok) {
      toastSuccess("شماره تماس کپی شد");
      const old = btn.textContent;
      btn.textContent = "✓ کپی شد";
      setTimeout(() => (btn.textContent = old), 1800);
    } else {
      toastInfo("کپی نشد. دستی انتخاب کن.");
    }
  });

  return card;
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
    /* Re-render to reflect new state (we stay on support tab) */
    renderSupport();
  });

  return box;
}

/* ------------------------------------------------------------
   Utilities
   ------------------------------------------------------------ */

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    /* Fallback */
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}