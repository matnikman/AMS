/* ============================================================
   AMS — Session dates modal
   Lets the teacher edit the date of each session.
   ============================================================ */

import * as store from "../data/store.js";
import { toastSuccess, toastError } from "../core/toast.js";
import { fa } from "../core/numbers.js";

/**
 * Open the session-dates modal for a course.
 * @param {object} course
 * @param {function} [onClose]
 */
export function openSessionDatesModal(course, onClose) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const dates = course.session_dates || {};
  const sessions = Object.keys(dates).map(Number).sort((a, b) => a - b);

  const rowsHtml = sessions.length
    ? sessions
        .map(
          (s) => `
        <tr>
          <td class="col-session">جلسهٔ ${fa(s)}</td>
          <td>
            <input class="form-field__input date-input"
                   data-session="${s}"
                   value="${escapeHtml(dates[s] || "")}"
                   placeholder="۱۴۰۵/۰۷/۱۸" />
          </td>
        </tr>
      `
        )
        .join("")
    : `<tr><td colspan="2" class="table-empty">هنوز جلسه‌ای ثبت نشده.</td></tr>`;

  overlay.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true">
      <h3 class="modal__title">تاریخ جلسات — ${escapeHtml(course.course_name)}</h3>
      <p class="modal__message">
        برای هر جلسه تاریخ برگزاری رو وارد کن. این تاریخ‌ها وقتی نمره یا حضور
        ثبت می‌کنی به‌طور خودکار استفاده می‌شن.
      </p>

      <div class="table-wrapper" style="margin-bottom:16px">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-session">جلسه</th>
              <th>تاریخ (شمسی)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <div class="btn-row" style="margin-bottom:16px">
        <button class="btn" data-action="add-session">+ افزودن جلسه</button>
      </div>

      <div class="form-actions">
        <button class="btn" data-action="cancel">انصراف</button>
        <button class="btn btn--primary" data-action="save">ذخیره</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();

  overlay
    .querySelector('[data-action="cancel"]')
    .addEventListener("click", close);

  overlay
    .querySelector('[data-action="add-session"]')
    .addEventListener("click", () => {
      const tbody = overlay.querySelector("tbody");
      const existing = [...tbody.querySelectorAll("[data-session]")].map((i) =>
        Number(i.dataset.session)
      );
      const next = existing.length ? Math.max(...existing) + 1 : 1;
      const today =
        window.AMS?.jalali?.todayJalali?.() ||
        new Date().toISOString().slice(0, 10);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-session">جلسهٔ ${fa(next)}</td>
        <td>
          <input class="form-field__input date-input"
                 data-session="${next}"
                 value="${escapeHtml(today)}"
                 placeholder="۱۴۰۵/۰۷/۱۸" />
        </td>
      `;
      tbody.appendChild(tr);
    });

  overlay
    .querySelector('[data-action="save"]')
    .addEventListener("click", () => {
      const newDates = {};
      let ok = true;

      overlay.querySelectorAll(".date-input").forEach((input) => {
        const s = Number(input.dataset.session);
        const val = input.value.trim();
        if (!val) {
          toastError(`تاریخ جلسهٔ ${fa(s)} خالیه`);
          ok = false;
          return;
        }
        newDates[s] = val;
      });

      if (!ok) return;

      const fresh = store.findCourse(course.id);
      if (!fresh) {
        toastError("کلاس پیدا نشد");
        return;
      }

      store.updateCourse(course.id, { session_dates: newDates });

      toastSuccess("تاریخ جلسات ذخیره شد");
      close();
      onClose?.();
    });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}