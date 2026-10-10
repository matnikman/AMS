/* ============================================================
   AMS — Courses tab
   Lists courses as expandable cards.
   Each card shows the enrolled students with per-student actions.
   ============================================================ */

import * as store from "../data/store.js";
import { confirmModal } from "./modal.js";
import { toastSuccess, toastError } from "../core/toast.js";
import { fa } from "../core/numbers.js";
import { setTab } from "./tabs.js";
import { buildSearchInput, normalize } from "./search.js";
import { openSessionDatesModal } from "./sessionDatesModal.js";
import { openImportModal } from "./import.js";
import { openStudentModal } from "./studentModal.js";
import { openAddStudentModal } from "./addStudentModal.js";
import { fullName } from "../utils/format.js";
import { recordsForStudent, studentAverage, formatGradeOrDash } from "../core/grades.js";

let selectedCourseId = null;
let courseSearchQuery = "";
let expandedCourses = new Set(); /* course ids currently showing students */

/* ------------------------------------------------------------
   Public API
   ------------------------------------------------------------ */

export function getSelectedCourseId() {
  return selectedCourseId;
}

export function setSelectedCourseId(id) {
  selectedCourseId = id;
}

/* ------------------------------------------------------------
   Render
   ------------------------------------------------------------ */

export function renderCourseList() {
  const panel = document.getElementById("tab-courses");
  if (!panel) return;

  const courses = store.loadCourses();
  panel.innerHTML = "";

  /* Header */
  const header = document.createElement("div");
  header.className = "section-title";
  header.innerHTML = `<span>کلاس‌های شما (${fa(courses.length)})</span>`;

  const addBtn = document.createElement("button");
  addBtn.className = "btn btn--primary";
  addBtn.textContent = "+ افزودن از PDF";
  addBtn.addEventListener("click", () => openImportModal());
  header.appendChild(addBtn);
  panel.appendChild(header);

  /* Empty state */
  if (!courses.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state__icon">📚</div>
      <div class="empty-state__title">هنوز کلاسی نداری</div>
      <div class="empty-state__hint">با افزودن PDF از پنل استاد، اولین کلاس رو بساز.</div>
    `;
    panel.appendChild(empty);
    return;
  }

  /* Search */
  const search = buildSearchInput({
    placeholder: "جست‌وجو در نام کلاس یا نام مدرس...",
    onChange: (value) => {
      courseSearchQuery = value;
      rerenderCards(panel, courses);
    },
  });
  const input = search.querySelector(".search-box__input");
  if (input && courseSearchQuery) {
    input.value = courseSearchQuery;
    const clearBtn = search.querySelector(".search-box__clear");
    if (clearBtn) clearBtn.hidden = false;
  }
  panel.appendChild(search);

  /* Cards */
  const cardsBox = document.createElement("div");
  cardsBox.className = "course-cards";
  panel.appendChild(cardsBox);
  renderCardsInto(cardsBox, courses);
}

function rerenderCards(panel, courses) {
  const cardsBox = panel.querySelector(".course-cards");
  if (!cardsBox) return;
  renderCardsInto(cardsBox, courses);
}

function renderCardsInto(container, courses) {
  container.innerHTML = "";

  const q = normalize(courseSearchQuery);
  const filtered = !q
    ? courses
    : courses.filter(
        (c) =>
          normalize(c.course_name).includes(q) ||
          normalize(c.teacher_name).includes(q) ||
          normalize(c.course_code).includes(q) ||
          normalize(c.class_code).includes(q)
      );

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<div class="empty-state__title">کلاسی با این جست‌وجو پیدا نشد</div>`;
    container.appendChild(empty);
    return;
  }

  for (const course of filtered) {
    container.appendChild(buildCourseCard(course));
  }
}

/* ------------------------------------------------------------
   Course card
   ------------------------------------------------------------ */

function buildCourseCard(course) {
  const card = document.createElement("div");
  card.className = "card course-card";

  const isSelected = course.id === selectedCourseId;
  const isExpanded = expandedCourses.has(course.id);
  const sessionCount = Object.keys(course.session_dates || {}).length;
  const students = store.studentsInCourse(course.id);

  card.innerHTML = `
    <div class="card__header">
      <div>
        <h3 class="card__title">${escapeHtml(course.course_name)}</h3>
        <div class="card__subtitle">${escapeHtml(course.teacher_name || "")}</div>
      </div>
      ${isSelected ? '<span class="badge badge--accent">انتخاب‌شده</span>' : ""}
    </div>
    <div class="card__meta">
      <span class="card__meta-item">
        <span class="card__meta-label">کد درس:</span>
        <span class="card__meta-value">${escapeHtml(course.course_code || "—")}</span>
      </span>
      <span class="card__meta-item">
        <span class="card__meta-label">کد ارائه:</span>
        <span class="card__meta-value">${escapeHtml(course.class_code || "—")}</span>
      </span>
      <span class="card__meta-item">
        <span class="card__meta-label">زمان:</span>
        <span class="card__meta-value">${escapeHtml(course.class_time || "—")}</span>
      </span>
      <span class="card__meta-item">
        <span class="card__meta-label">دانشجو:</span>
        <span class="card__meta-value">${fa(students.length)}</span>
      </span>
      <span class="card__meta-item">
        <span class="card__meta-label">جلسات:</span>
        <span class="card__meta-value">${fa(sessionCount)}</span>
      </span>
    </div>
    <div class="btn-row">
      <button class="btn btn--primary" data-action="select">
        ${isSelected ? "انتخاب‌شده" : "انتخاب"}
      </button>
      <button class="btn" data-action="toggle">${isExpanded ? "▲ پنهان دانشجوها" : "▼ نمایش دانشجوها"}</button>
      <button class="btn" data-action="edit">ویرایش</button>
      <button class="btn" data-action="dates">📅 تاریخ جلسات</button>
      <button class="btn btn--danger" data-action="delete">حذف</button>
    </div>
    <div class="course-students" ${isExpanded ? "" : "hidden"}>
      <div class="section-title">
        <span>دانشجوهای این کلاس (${fa(students.length)})</span>
        <button class="btn btn--sm" data-action="add-student">+ افزودن دانشجو</button>
      </div>
      <div class="student-list-box" data-students></div>
    </div>
  `;

  /* Bind actions */
  card.querySelector('[data-action="select"]').addEventListener("click", () => {
    selectedCourseId = course.id;
    toastSuccess(`کلاس «${course.course_name}» انتخاب شد`);
    renderCourseList();
    setTab("current");
  });

  card.querySelector('[data-action="toggle"]').addEventListener("click", () => {
    if (expandedCourses.has(course.id)) expandedCourses.delete(course.id);
    else expandedCourses.add(course.id);
    renderCourseList();
  });

  card.querySelector('[data-action="edit"]').addEventListener("click", () => {
    openEditForm(course);
  });

  card.querySelector('[data-action="dates"]').addEventListener("click", () => {
    openSessionDatesModal(course, () => renderCourseList());
  });

  card.querySelector('[data-action="delete"]').addEventListener("click", () => {
    deleteCourse(course);
  });

  card.querySelector('[data-action="add-student"]').addEventListener("click", () => {
    openAddStudentModal(course, () => renderCourseList());
  });

  /* Students list */
  if (isExpanded) {
    const box = card.querySelector("[data-students]");
    renderStudentsInto(box, course, students);
  }

  return card;
}

/* ------------------------------------------------------------
   Students inside a course card
   ------------------------------------------------------------ */

function renderStudentsInto(container, course, students) {
  container.innerHTML = "";

  if (!students.length) {
    container.innerHTML = `
      <div class="empty-inline">هنوز دانشجویی ثبت‌نام نشده.</div>
    `;
    return;
  }

  /* Sort by name (Persian) */
  const sorted = [...students].sort((a, b) =>
    fullName(a.first, a.last).localeCompare(fullName(b.first, b.last), "fa")
  );

  for (const student of sorted) {
    container.appendChild(buildStudentRow(course, student));
  }
}

function buildStudentRow(course, student) {
  const row = document.createElement("div");
  row.className = "student-row";

  /* Stats */
  const records = recordsForStudent(course.grades || [], student.id);
  const avg = studentAverage(course.grades || [], student.id);
  const totalSessions = Object.keys(course.session_dates || {}).length || 0;
  const presentCount = countAttendance(course, student.id);
  const attendancePercent = totalSessions
    ? Math.round((presentCount / totalSessions) * 100)
    : 0;

  row.innerHTML = `
    <div class="student-row__info">
      <div class="student-row__name">
        <button class="student-link" data-action="details">${escapeHtml(fullName(student.first, student.last))}</button>
      </div>
      <div class="student-row__num">${fa(student.num)}</div>
      <div class="student-row__stats">
        <span class="stat-pill">
          <span class="stat-pill__label">حضور</span>
          <span class="stat-pill__value">${totalSessions ? fa(attendancePercent) + "٪" : "—"}</span>
        </span>
        <span class="stat-pill">
          <span class="stat-pill__label">میانگین</span>
          <span class="stat-pill__value">${formatGradeOrDash(avg)}</span>
        </span>
        <span class="stat-pill">
          <span class="stat-pill__label">نمرات</span>
          <span class="stat-pill__value">${fa(records.length)}</span>
        </span>
      </div>
    </div>
    <div class="student-row__actions">
      <button class="btn btn--sm" data-action="details">جزئیات</button>
      <button class="btn btn--sm" data-action="remove">حذف از کلاس</button>
    </div>
  `;

  row.querySelectorAll('[data-action="details"]').forEach((el) => {
    el.addEventListener("click", () => {
      openStudentModal(
        { ...course, students: store.studentsInCourse(course.id) },
        student
      );
    });
  });

  row.querySelector('[data-action="remove"]').addEventListener("click", async () => {
    const ok = await confirmModal({
      title: "حذف از کلاس",
      message: `«${fullName(student.first, student.last)}» از کلاس «${course.course_name}» حذف بشه؟ (اطلاعات دانشجو باقی می‌مونه)`,
      confirmText: "حذف کن",
      cancelText: "انصراف",
    });
    if (!ok) return;
    store.unenroll(student.id, course.id);
    toastSuccess("دانشجو از کلاس حذف شد");
    renderCourseList();
  });

  return row;
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

/* ------------------------------------------------------------
   Delete course
   ------------------------------------------------------------ */

async function deleteCourse(course) {
  const ok = await confirmModal({
    title: "حذف کلاس",
    message: `آیا از حذف کلاس «${course.course_name}» مطمئنی؟ تمام حضور و نمرات این کلاس پاک می‌شود، ولی اطلاعات دانشجوها باقی می‌ماند.`,
    confirmText: "حذف کن",
    cancelText: "انصراف",
  });
  if (!ok) return;

  store.removeCourse(course.id);
  if (selectedCourseId === course.id) selectedCourseId = null;
  expandedCourses.delete(course.id);
  toastSuccess("کلاس حذف شد");
  renderCourseList();
}

/* ------------------------------------------------------------
   Edit form
   ------------------------------------------------------------ */

const EDITABLE_FIELDS = [
  { key: "course_code", label: "کد درس" },
  { key: "class_code", label: "کد ارائه کلاس" },
  { key: "course_name", label: "نام درس" },
  { key: "teacher_name", label: "نام مدرس" },
  { key: "class_time", label: "زمان برگزاری کلاس" },
  { key: "exam_time", label: "زمان برگزاری امتحان" },
  { key: "class_location", label: "مکان کلاس" },
  { key: "class_status", label: "وضعیت کلاس" },
  { key: "department", label: "گروه آموزشی" },
  { key: "faculty", label: "دانشکده" },
];

function openEditForm(course) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const fieldsHtml = EDITABLE_FIELDS.map(
    (f) => `
    <label class="form-field">
      <span class="form-field__label">${escapeHtml(f.label)}</span>
      <input class="form-field__input" data-key="${f.key}"
             value="${escapeHtml(String(course[f.key] ?? ""))}" />
    </label>
  `
  ).join("");

  overlay.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true">
      <div class="modal__header">
        <h3 class="modal__title">ویرایش کلاس</h3>
        <button class="btn btn--ghost" data-action="close">بستن</button>
      </div>
      <div class="form-grid">${fieldsHtml}</div>
      <div class="form-actions">
        <button class="btn" data-action="cancel">انصراف</button>
        <button class="btn btn--primary" data-action="save">ذخیره</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();

  overlay
    .querySelector('[data-action="close"]')
    .addEventListener("click", close);
  overlay
    .querySelector('[data-action="cancel"]')
    .addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  overlay
    .querySelector('[data-action="save"]')
    .addEventListener("click", () => {
      const patch = {};
      overlay.querySelectorAll(".form-field__input").forEach((input) => {
        patch[input.dataset.key] = input.value.trim();
      });

      store.updateCourse(course.id, patch);
      toastSuccess("تغییرات ذخیره شد");
      close();
      renderCourseList();
    });

  document.body.appendChild(overlay);
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