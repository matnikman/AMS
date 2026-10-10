/* ============================================================
   AMS — Add student modal
   Two modes:
     - With a specific course (from course card)  → auto-enroll
     - Without a course (from students tab)       → pick or skip
   ============================================================ */

import * as store from "../data/store.js";
import { toastSuccess, toastError } from "../core/toast.js";
import { fa } from "../core/numbers.js";

/**
 * Open the "add student" modal.
 *
 * @param {object|null} course — pass null or omit to allow choosing a course
 * @param {function}    [onDone]
 */
export function openAddStudentModal(course = null, onDone) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const allCourses = store.loadCourses();
  const fromCourse = !!course && course.id && course.id !== "_global";

  /* Build the course selector (only shown in "from students tab" mode) */
  let courseSelectorHtml = "";
  if (!fromCourse) {
    if (allCourses.length) {
      courseSelectorHtml = `
        <div class="form-field">
          <span class="form-field__label">کلاس</span>
          <select class="form-field__select" data-key="course_id">
            <option value="">— بدون کلاس —</option>
            ${allCourses
              .map(
                (c) => `
              <option value="${escapeHtml(c.id)}">
                ${escapeHtml(c.course_name)}${c.class_code ? ` (${escapeHtml(c.class_code)})` : ""}
              </option>
            `
              )
              .join("")}
          </select>
        </div>
      `;
    } else {
      courseSelectorHtml = `
        <div class="form-info form-info--muted">
          هنوز کلاسی وجود نداره. دانشجو بدون کلاس ثبت می‌شه.
        </div>
      `;
    }
  }

  const title = fromCourse
    ? `افزودن دانشجو به «${escapeHtml(course.course_name)}»`
    : "افزودن دانشجو";

  overlay.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true">
      <div class="modal__header">
        <h3 class="modal__title">${title}</h3>
        <button class="btn btn--ghost" data-action="close">بستن</button>
      </div>

      <p class="modal__message">
        اگه دانشجو با این شماره قبلاً ثبت شده باشه، همون اطلاعات استفاده می‌شه
        و فقط به کلاس انتخاب‌شده اضافه می‌شه.
      </p>

      <div class="form-grid">
        <label class="form-field">
          <span class="form-field__label">شمارهٔ دانشجویی *</span>
          <input class="form-field__input" data-key="num" placeholder="۴۰۴۷۲۷۸۲۳" />
        </label>
        <label class="form-field">
          <span class="form-field__label">نام *</span>
          <input class="form-field__input" data-key="first" />
        </label>
        <label class="form-field">
          <span class="form-field__label">نام خانوادگی *</span>
          <input class="form-field__input" data-key="last" />
        </label>
        <label class="form-field">
          <span class="form-field__label">رشته</span>
          <input class="form-field__input" data-key="field" placeholder="مهندسی شیمی" />
        </label>
        <label class="form-field">
          <span class="form-field__label">مقطع</span>
          <input class="form-field__input" data-key="degree" placeholder="کارشناسی پیوسته" />
        </label>
        <label class="form-field">
          <span class="form-field__label">سیستم</span>
          <input class="form-field__input" data-key="system" placeholder="(خالی بذار اگه نیست)" />
        </label>
        ${courseSelectorHtml}
      </div>

      <div data-info class="form-info" hidden></div>

      <div class="form-actions">
        <button class="btn" data-action="cancel">انصراف</button>
        <button class="btn btn--primary" data-action="save">افزودن</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();

  overlay.querySelector('[data-action="close"]').addEventListener("click", close);
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  /* Live lookup on student number */
  const numInput = overlay.querySelector('[data-key="num"]');
  const infoBox = overlay.querySelector("[data-info]");

  numInput.addEventListener("input", () => {
    const num = normalizeDigits(numInput.value.trim());
    if (!num) {
      infoBox.hidden = true;
      return;
    }
    const existing = store.findStudent(num);
    if (existing) {
      infoBox.hidden = false;
      infoBox.innerHTML = `
        <strong>دانشجو پیدا شد:</strong>
        ${escapeHtml(existing.first + " " + existing.last)}
        — ${escapeHtml(existing.field || "—")}
      `;
      const set = (k, v) => {
        const el = overlay.querySelector(`[data-key="${k}"]`);
        if (el && !el.value) el.value = v || "";
      };
      set("first", existing.first);
      set("last", existing.last);
      set("field", existing.field);
      set("degree", existing.degree);
      set("system", existing.system);
    } else {
      infoBox.hidden = true;
    }
  });

  overlay.querySelector('[data-action="save"]').addEventListener("click", () => {
    const data = {};
    overlay.querySelectorAll("[data-key]").forEach((input) => {
      data[input.dataset.key] = input.value.trim();
    });

    /* Normalize Persian digits in num */
    data.num = normalizeDigits(data.num);

    if (!data.num) {
      toastError("شمارهٔ دانشجویی رو وارد کن.");
      return;
    }
    if (!data.first || !data.last) {
      toastError("نام و نام خانوادگی رو وارد کن.");
      return;
    }

    /* Determine target course id */
    let targetCourseId = null;
    if (fromCourse) {
      targetCourseId = course.id;
    } else if (data.course_id) {
      targetCourseId = data.course_id;
    }

    /* Check duplicate enrollment (only when we have a course) */
    if (targetCourseId) {
      const existing = store.findStudent(data.num);
      if (existing && store.isEnrolled(existing.id, targetCourseId)) {
        toastError("این دانشجو قبلاً تو این کلاس ثبت‌نام شده.");
        return;
      }
    }

    /* Upsert student */
    const student = store.upsertStudent({
      num: data.num,
      first: data.first,
      last: data.last,
      field: data.field,
      degree: data.degree,
      system: data.system,
    });
    if (!student) {
      toastError("خطا در ذخیرهٔ دانشجو.");
      return;
    }

    /* Enroll if a course was chosen */
    if (targetCourseId) {
      store.enroll(student.id, targetCourseId, "اصلی");

      /* Update student_count on the course */
      const count = store.studentsInCourse(targetCourseId).length;
      store.updateCourse(targetCourseId, { student_count: count });

      const c = store.findCourse(targetCourseId);
      toastSuccess(
        `«${data.first} ${data.last}» به «${c?.course_name || "کلاس"}» اضافه شد.`
      );
    } else {
      toastSuccess(`«${data.first} ${data.last}» ثبت شد.`);
    }

    close();
    onDone?.();
  });

  document.body.appendChild(overlay);
  numInput.focus();
}

/* ------------------------------------------------------------
   Utilities
   ------------------------------------------------------------ */

function normalizeDigits(s) {
  return String(s || "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
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