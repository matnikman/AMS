/* ============================================================
   AMS — Grade entry modal
   Add or edit a grade for a student in a session.
   Preserves date from session_dates.
   ============================================================ */

import * as store from "../data/store.js";
import { toastSuccess, toastError } from "../core/toast.js";
import { fa } from "../core/numbers.js";
import { fullName } from "../utils/format.js";
import {
  createRecord,
  parseGrade,
  validateRecord,
  suggestTitles,
} from "../core/grades.js";

/**
 * Open the grade-entry modal.
 * @param {object} opts
 * @param {object} opts.course
 * @param {object} opts.student
 * @param {number} [opts.session]      — default = current session
 * @param {object} [opts.record]       — if editing an existing record
 * @param {function} [opts.onDone]
 */
export function openGradeModal({ course, student, session, record, onDone }) {
  const isEdit = !!record;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const sessions = Object.keys(course.session_dates || {})
    .map(Number)
    .sort((a, b) => a - b);
  if (!sessions.length) sessions.push(1);

  const defaultSession = record?.session || session || sessions[0];
  const suggestedTitles = suggestTitles(course.grades || []);

  overlay.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true">
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? "ویرایش نمره" : "ثبت نمره"}</h3>
        <button class="btn btn--ghost" data-action="close">بستن</button>
      </div>

      <div class="grade-modal__student">
        <strong>${escapeHtml(fullName(student.first, student.last))}</strong>
        <span class="grade-modal__num">${fa(student.num)}</span>
      </div>

      <div class="form-grid">
        <label class="form-field">
          <span class="form-field__label">جلسه *</span>
          <select class="form-field__select" data-key="session">
            ${sessions
              .map(
                (s) =>
                  `<option value="${s}" ${s === defaultSession ? "selected" : ""}>جلسهٔ ${fa(s)} — ${escapeHtml(
                    course.session_dates?.[s] || "—"
                  )}</option>`
              )
              .join("")}
          </select>
        </label>

        <label class="form-field">
          <span class="form-field__label">عنوان *</span>
          <input class="form-field__input" data-key="title" list="grade-titles"
                 placeholder="مثلاً تمرین ۱، کوییز، میان‌ترم..."
                 value="${escapeHtml(record?.title || "")}" />
          <datalist id="grade-titles">
            ${suggestedTitles.map((t) => `<option value="${escapeHtml(t)}"></option>`).join("")}
          </datalist>
        </label>

        <label class="form-field">
          <span class="form-field__label">نمره (از ۲۰) *</span>
          <input class="form-field__input" data-key="value" type="text" inputmode="decimal"
                 placeholder="۱۸.۵"
                 value="${record && typeof record.value === "number" ? fa(record.value) : ""}" />
        </label>
      </div>

      <div class="form-actions">
        <button class="btn" data-action="cancel">انصراف</button>
        <button class="btn btn--primary" data-action="save">
          ${isEdit ? "ذخیره" : "ثبت"}
        </button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();

  overlay.querySelector('[data-action="close"]').addEventListener("click", close);
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const titleInput = overlay.querySelector('[data-key="title"]');
  const valueInput = overlay.querySelector('[data-key="value"]');

  /* Focus first empty field */
  if (!titleInput.value) titleInput.focus();
  else valueInput.focus();

  overlay.querySelector('[data-action="save"]').addEventListener("click", () => {
    const session = Number(overlay.querySelector('[data-key="session"]').value);
    const title = titleInput.value.trim();
    const rawValue = valueInput.value.trim();

    const value = parseGrade(rawValue);
    if (value === null) {
      toastError("عدد نمره معتبر نیست.");
      valueInput.focus();
      return;
    }

    /* Date from session_dates */
    const date = course.session_dates?.[session] || "";

    /* Build the record */
    const candidate = {
      session,
      student_id: student.id,
      title,
      value,
      date,
      sessionDates: course.session_dates,
    };

    const check = validateRecord({
      ...candidate,
      id: record?.id || "temp",
    });
    if (!check.ok) {
      toastError(check.error);
      return;
    }

    let grades = [...(course.grades || [])];
    const fresh = store.findCourse(course.id);
    if (!fresh) {
      toastError("کلاس پیدا نشد.");
      return;
    }
    grades = [...(fresh.grades || [])];

    if (isEdit) {
      /* Replace by id */
      const idx = grades.findIndex((g) => g.id === record.id);
      if (idx < 0) {
        toastError("نمرهٔ اصلی پیدا نشد.");
        return;
      }
      grades[idx] = { ...grades[idx], session, title, value, date };
    } else {
      /* Check duplicate: same student + session + title */
      const dup = grades.some(
        (g) =>
          g.student_id === student.id &&
          g.session === session &&
          g.title === title
      );
      if (dup) {
        toastError("این نمره قبلاً برای این دانشجو در این جلسه ثبت شده.");
        return;
      }
      grades.push(createRecord(candidate));
    }

    store.updateCourse(course.id, { grades });
    toastSuccess(isEdit ? "نمره ویرایش شد" : "نمره ثبت شد");
    close();
    onDone?.();
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