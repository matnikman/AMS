/* ============================================================
   AMS — Theme picker (loop-safe)
   Changes theme without re-rendering any parent.
   ============================================================ */

import { updateSettings } from "../core/settings.js";
import { toastSuccess } from "../core/toast.js";

export const THEMES = [
  { key: "light", label: "روشن",      colors: ["#4f46e5", "#f0f2f7", "#1a1d23"] },
  { key: "dark",  label: "تیره",      colors: ["#6366f1", "#0f1115", "#f1f3f7"] },
  { key: "gray",  label: "خاکستری",   colors: ["#374151", "#e5e7eb", "#1f2937"] },
  { key: "eye",   label: "محافظ چشم", colors: ["#b45309", "#f5efe0", "#3a3226"] },
];

export function buildThemePicker() {
  const wrap = document.createElement("div");
  wrap.className = "theme-picker";

  let current = document.documentElement.getAttribute("data-theme") || "light";

  /* Create all cards once */
  const cards = {};

  for (const theme of THEMES) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-card";
    if (theme.key === current) card.classList.add("theme-card--active");
    card.setAttribute("aria-label", theme.label);

    card.innerHTML = `
      <div class="theme-card__preview" style="background:${theme.colors[1]}">
        <div class="theme-card__bar" style="background:${theme.colors[0]}"></div>
        <div class="theme-card__line" style="background:${theme.colors[2]};width:70%"></div>
        <div class="theme-card__line" style="background:${theme.colors[2]};width:50%"></div>
        <div class="theme-card__line" style="background:${theme.colors[2]};width:85%"></div>
      </div>
      <div class="theme-card__label">${theme.label}</div>
      <div class="theme-card__check" ${theme.key === current ? "" : "hidden"}>✓</div>
    `;

    card.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (theme.key === current) return;

      /* 1. Update settings (persist) */
      updateSettings({ theme: theme.key });

      /* 2. Apply to <html> immediately */
      document.documentElement.setAttribute("data-theme", theme.key);
      try { localStorage.setItem("ams.theme", theme.key); } catch {}

      /* 3. Update check marks in-place */
      for (const key of Object.keys(cards)) {
        const c = cards[key];
        const check = c.querySelector(".theme-card__check");
        const isActive = key === theme.key;
        c.classList.toggle("theme-card--active", isActive);
        if (check) check.hidden = !isActive;
      }

      current = theme.key;

      /* 4. Toast */
      toastSuccess(`تم «${theme.label}» فعال شد`);
    });

    cards[theme.key] = card;
    wrap.appendChild(card);
  }

  return wrap;
}
