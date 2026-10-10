/* ============================================================
   AMS — Theme picker
   Visual color-card selector for the 4 themes.
   ============================================================ */

import { getSettings, updateSettings } from "../core/settings.js";
import { toastSuccess } from "../core/toast.js";

export const THEMES = [
  { key: "light", label: "روشن",      colors: ["#4f46e5", "#f0f2f7", "#1a1d23"] },
  { key: "dark",  label: "تیره",      colors: ["#6366f1", "#0f1115", "#f1f3f7"] },
  { key: "gray",  label: "خاکستری",   colors: ["#374151", "#e5e7eb", "#1f2937"] },
  { key: "eye",   label: "محافظ چشم", colors: ["#b45309", "#f5efe0", "#3a3226"] },
];

/**
 * Build the theme picker section.
 */
export function buildThemePicker() {
  const wrap = document.createElement("div");
  wrap.className = "theme-picker";

  const current = getSettings().theme;

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
      ${theme.key === current ? '<div class="theme-card__check">✓</div>' : ""}
    `;

    card.addEventListener("click", () => {
      /* 1. Save setting */
      updateSettings({ theme: theme.key });

      /* 2. Apply immediately to <html> */
      document.documentElement.setAttribute("data-theme", theme.key);

      /* 3. Persist for theme-boot */
      try {
        localStorage.setItem("ams.theme", theme.key);
      } catch {}

      /* 4. Update check marks in-place (no full re-render) */
      wrap.querySelectorAll(".theme-card").forEach((el) => {
        el.classList.remove("theme-card--active");
        const check = el.querySelector(".theme-card__check");
        if (check) check.remove();
      });
      card.classList.add("theme-card--active");
      const newCheck = document.createElement("div");
      newCheck.className = "theme-card__check";
      newCheck.textContent = "✓";
      card.appendChild(newCheck);

      toastSuccess(`تم «${theme.label}» فعال شد`);
    });

    wrap.appendChild(card);
  }

  return wrap;
}