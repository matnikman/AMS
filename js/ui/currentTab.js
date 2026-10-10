/* ============================================================
   AMS — "Current list" tab
   Shows the selected course header and the attendance table.
   Uses the store (students + courses + enrollments).
   ============================================================ */

import * as store from "../data/store.js";
import { getSelectedCourseId } from "./courseList.js";
import { setAttendanceCourse, renderAttendance } from "./attendance.js";
import { fa } from "../core/numbers.js";
import { setTab } from "./tabs.js";

let lastRenderedCourseId = null;

/**
 * Render the "current" tab.
 */
export function renderCurrentTab() {
  const panel = document.getElementById("tab-current");
  if (!panel) return;

  const courseId = getSelectedCourseId();

  /* Nothing selected */
  if (!courseId) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">👈</div>
        <div class="empty-state__title">کلاسی انتخاب نشده</div>
        <div class="empty-state__hint">از تب «کلاس‌ها» یک کلاس انتخاب کن.</div>
      </div>
    `;
    lastRenderedCourseId = null;
    return;
  }

  const course = store.findCourse(courseId);
  if (!course) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__title">کلاس پیدا نشد</div>
      </div>
    `;
    lastRenderedCourseId = null;
    return;
  }

  /* Fetch students enrolled in this course */
  const students = store.studentsInCourse(courseId);

  /* Reset session state if course changed */
  if (lastRenderedCourseId !== courseId) {
    setAttendanceCourse(courseId);
    lastRenderedCourseId = courseId;
  }

  panel.innerHTML = "";

  /* Header */
  panel.appendChild(buildCourseHeader(course, students.length));

  /* Attendance block — pass a course object that includes students */
  const attBox = document.createElement("div");
  attBox.className = "current-attendance";
  panel.appendChild(attBox);
  renderAttendance(attBox, { ...course, students });
}

/* ------------------------------------------------------------
   Header
   ------------------------------------------------------------ */

function buildCourseHeader(course, studentCount) {
  const card = document.createElement("div");
  card.className = "card course-header";

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h2 class="card__title">${escapeHtml(course.course_name)}</h2>
        <div class="card__subtitle">${escapeHtml(course.teacher_name || "")}</div>
      </div>
      <button class="btn btn--ghost" data-action="change">تغییر کلاس</button>
    </div>
    <div class="card__meta">
      <span class="card__meta-item">
        <span class="card__meta-label">زمان:</span>
        <span class="card__meta-value">${escapeHtml(course.class_time || "—")}</span>
      </span>
      <span class="card__meta-item">
        <span class="card__meta-label">کد ارائه:</span>
        <span class="card__meta-value">${escapeHtml(course.class_code || "—")}</span>
      </span>
      <span class="card__meta-item">
        <span class="card__meta-label">کد درس:</span>
        <span class="card__meta-value">${escapeHtml(course.course_code || "—")}</span>
      </span>
      <span class="card__meta-item">
        <span class="card__meta-label">دانشجو:</span>
        <span class="card__meta-value">${fa(studentCount)}</span>
      </span>
    </div>
  `;

  card.querySelector('[data-action="change"]').addEventListener("click", () => {
    setTab("courses");
  });

  return card;
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