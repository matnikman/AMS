/* ============================================================
   AMS — Student detail modal
   Shows grades, attendance summary, and lets you add/edit/delete
   grades and view per-session attendance.
   ============================================================ */

import { fullName } from "../utils/format.js";
import { fa } from "../core/numbers.js";
import * as store from "../data/store.js";
import { toastSuccess } from "../core/toast.js";
import { confirmModal } from "./modal.js";
import { openGradeModal } from "./gradeModal.js";
import {
  recordsForStudent,
  studentAverage,
  formatGradeOrDash,
  gradeStatus,
} from "../core/grades.js";

/**
 * Open the student detail modal.
 * @param {object} course — course object (with `.students` optionally attached)
 * @param {object} student
 */
export function openStudentModal(course, student) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  render(overlay, course, student);

  const close = () => overlay.remove();

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const onKey = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);

  document.body.appendChild(overlay);
}

/* ------------------------------------------------------------
   Render (re-renders after mutations)
   ------------------------------------------------------------ */

function render(overlay, course, student) {
  /* Fresh reads */
  const fresh = store.findCourse(course.id) || course;
  const students = store.studentsInCourse(fresh.id);
  const courseWithStudents = { ...fresh, students };

  const records = recordsForStudent(courseWithStudents.grades || [], student.id);
  const avg = studentAverage(courseWithStudents.grades || [], student.id);
  const totalSessions = Object.keys(courseWithStudents.session_dates || {}).length || 0;
  const presentCount = countAttendance(courseWithStudents, student.id);
  const attendancePercent = totalSessions
    ? Math.round((presentCount / totalSessions) * 100)
    : 0;

  /* Academic string */
  const academic = [
    student.field || "-",
    student.degree || "-",
    student.system || "-",
  ].join(" / ");
  /* Grade rows */
  const rowsHtml = records.length
    ? records
        .map(
          (r) => `
        <tr>
          <td class="col-session">جلسهٔ ${fa(r.session)}</td>
          <td class="col-title">${escapeHtml(r.title)}</td>
          <td class="col-num">${formatGradeOrDash(r.value)}</td>
          <td class="col-date">${escapeHtml(r.date || "—")}</td>
          <td class="col-actions">
            <button class="btn btn--sm btn--ghost" data-action="edit-grade" data-id="${r.id}" title="ویرایش">✏️</button>
            <button class="btn btn--sm btn--ghost" data-action="delete-grade" data-id="${r.id}" title="حذف">🗑️</button>
          </td>
        </tr>
      `
        )
        .join("")
    : `<tr><td colspan="5" class="table-empty">هنوز نمره‌ای ثبت نشده.</td></tr>`;

  overlay.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true">
      <div class="student-modal__header">
        <div>
          <h3 class="modal__title">${escapeHtml(fullName(student.first, student.last))}</h3>
          <div class="student-modal__meta">
            <span>شمارهٔ دانشجویی: ${fa(student.num)}</span>
            ${academic ? `<span>${escapeHtml(academic)}</span>` : ""}
            ${student.student_course_code ? `<span>کد درس: ${fa(student.student_course_code)}</span>` : ""}
          </div>
        </div>
        <button class="btn btn--ghost" data-action="close">بستن</button>
      </div>

      <div class="student-modal__stats">
        <div class="stat">
          <div class="stat__label">میانگین نمرات</div>
          <div class="stat__value">${formatGradeOrDash(avg)}</div>
          <div class="stat__hint">${escapeHtml(gradeStatus(avg))}</div>
        </div>
        <div class="stat">
          <div class="stat__label">حضور</div>
          <div class="stat__value">${fa(presentCount)} / ${fa(totalSessions)}</div>
          <div class="stat__hint">${totalSessions ? fa(attendancePercent) + "٪" : "—"}</div>
        </div>
        <div class="stat">
          <div class="stat__label">تعداد نمرات</div>
          <div class="stat__value">${fa(records.length)}</div>
        </div>
      </div>

      <div class="section-title">
        <span>نمرات</span>
        <button class="btn btn--primary btn--sm" data-action="add-grade">+ ثبت نمره</button>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-session">جلسه</th>
              <th class="col-title">عنوان</th>
              <th class="col-num">نمره</th>
              <th class="col-date">تاریخ</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <div class="section-title" style="margin-top:16px">
        <span>حضور</span>
      </div>
      <div class="student-attendance-list">
        ${buildAttendanceList(courseWithStudents, student.id)}
      </div>
    </div>
  `;

  /* Bind handlers */
  overlay.querySelector('[data-action="close"]').addEventListener("click", () => {
    overlay.remove();
  });

  overlay
    .querySelector('[data-action="add-grade"]')
    .addEventListener("click", () => {
      openGradeModal({
        course: courseWithStudents,
        student,
        onDone: () => {
          /* re-render the modal */
          render(overlay, course, student);
        },
      });
    });

  overlay.querySelectorAll('[data-action="edit-grade"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const record = (courseWithStudents.grades || []).find((g) => g.id === id);
      if (!record) return;
      openGradeModal({
        course: courseWithStudents,
        student,
        record,
        onDone: () => render(overlay, course, student),
      });
    });
  });

  overlay.querySelectorAll('[data-action="delete-grade"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const record = (courseWithStudents.grades || []).find((g) => g.id === id);
      if (!record) return;

      const ok = await confirmModal({
        title: "حذف نمره",
        message: `نمرهٔ «${escapeHtml(record.title)}» (جلسهٔ ${fa(record.session)}) حذف بشه؟`,
        confirmText: "حذف کن",
        cancelText: "انصراف",
      });
      if (!ok) return;

      const newGrades = (courseWithStudents.grades || []).filter((g) => g.id !== id);
      store.updateCourse(courseWithStudents.id, { grades: newGrades });
      toastSuccess("نمره حذف شد");
      render(overlay, course, student);
    });
  });
}

/* ------------------------------------------------------------
   Attendance list
   ------------------------------------------------------------ */

function buildAttendanceList(course, studentId) {
  const sessions = Object.keys(course.session_dates || {})
    .map(Number)
    .sort((a, b) => a - b);
  if (!sessions.length) {
    return `<div class="empty-inline">هنوز جلسه‌ای ثبت نشده.</div>`;
  }

  const labels = {
    present: "حاضر",
    absent: "غایب",
    late: "تأخیر",
    excused: "مرخصی",
    "": "ثبت‌نشده",
  };

  return `
    <div class="att-list">
      ${sessions
        .map((s) => {
          const status = course.attendance?.[s]?.[studentId] || "";
          const cls = status || "unset";
          return `
          <div class="att-item att-item--${cls}">
            <div class="att-item__session">جلسهٔ ${fa(s)}</div>
            <div class="att-item__date">${escapeHtml(course.session_dates?.[s] || "—")}</div>
            <div class="att-item__status">${labels[status] || "ثبت‌نشده"}</div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function countAttendance(course, studentId) {
  const att = course.attendance || {};
  let n = 0;
  for (const session of Object.keys(att)) {
    const s = att[session]?.[studentId];
    if (s === "present" || s === "late") n++;
  }
  return n;
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