/* ============================================================
   AMS — Attendance table
   Weekly grid with sorting, search, session management,
   and per-student grade entry.
   Uses the store for course/attendance persistence.
   The caller passes a course object with `.students` attached.
   ============================================================ */

import * as store from "../data/store.js";
import { toastSuccess } from "../core/toast.js";
import { fa } from "../core/numbers.js";
import { fullName } from "../utils/format.js";
import { openStudentModal } from "./studentModal.js";
import { openGradeModal } from "./gradeModal.js";
import { confirmModal } from "./modal.js";
import {
  createSortState,
  toggleSort,
  applySort,
  sortIndicator,
} from "./tableSort.js";
import { buildSearchInput, filterStudents } from "./search.js";

/* ------------------------------------------------------------
   State
   ------------------------------------------------------------ */

let currentSession = 1;
let currentCourseId = null;
let saveTimer = null;
let searchQuery = "";
let sortState = createSortState();

let dirty = false;
let lastSavedAt = null;

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */

/**
 * Notify the courses tab to refresh its cards.
 * Used after any mutation that changes card contents (e.g. sessions).
 * Dynamic import breaks the circular dependency between
 * attendance.js and courseList.js.
 */
function syncCoursesTab() {
  import("./courseList.js").then((m) => m.renderCourseList()).catch(() => {});
}

/* ------------------------------------------------------------
   Public API
   ------------------------------------------------------------ */

export function setAttendanceCourse(courseId) {
  currentCourseId = courseId;
  currentSession = 1;
  searchQuery = "";
  sortState = createSortState();
  dirty = false;
  lastSavedAt = null;
}

export function getCurrentSession() {
  return currentSession;
}

export function setCurrentSession(n) {
  currentSession = Number(n) || 1;
}

export function renderAttendance(container, course) {
  if (!container || !course) return;

  container.innerHTML = "";
  container.appendChild(buildSessionSelector(course));
  container.appendChild(buildToolbar(course));
  container.appendChild(buildAttendanceTable(course));
  container.appendChild(buildSummary(course));
}

/* ------------------------------------------------------------
   Session selector
   ------------------------------------------------------------ */

function buildSessionSelector(course) {
  const box = document.createElement("div");
  box.className = "session-selector";

  const label = document.createElement("span");
  label.className = "session-selector__label";
  label.textContent = "جلسه:";
  box.appendChild(label);

  const sessions = Object.keys(course.session_dates || {})
    .map(Number)
    .sort((a, b) => a - b);
  if (!sessions.length) sessions.push(1);

  for (const s of sessions) {
    const wrap = document.createElement("span");
    wrap.className = "session-chip";

    const btn = document.createElement("button");
    btn.className = "session-btn";
    if (s === currentSession) btn.classList.add("session-btn--active");
    btn.textContent = fa(s);
    btn.addEventListener("click", () => {
      currentSession = s;
      searchQuery = "";
      rerenderCurrent(course);
    });
    wrap.appendChild(btn);

    if (sessions.length > 1) {
      const del = document.createElement("button");
      del.className = "session-del";
      del.textContent = "✕";
      del.title = `حذف جلسهٔ ${fa(s)}`;
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        removeSession(course, s);
      });
      wrap.appendChild(del);
    }

    box.appendChild(wrap);
  }

  const addBtn = document.createElement("button");
  addBtn.className = "session-btn session-btn--add";
  addBtn.textContent = "+ جلسه";
  addBtn.title = "افزودن جلسهٔ جدید با تاریخ امروز";
  addBtn.addEventListener("click", () => addNewSession(course));
  box.appendChild(addBtn);

  const dateLabel = document.createElement("span");
  dateLabel.className = "session-selector__date";
  const date = course.session_dates?.[currentSession] || "—";
  dateLabel.textContent = `تاریخ: ${date}`;
  box.appendChild(dateLabel);

  return box;
}

/** Re-render the whole attendance block, reading fresh data. */
function rerenderCurrent(course) {
  const fresh = store.findCourse(course.id);
  if (!fresh) return;
  const students = store.studentsInCourse(course.id);
  renderAttendance(
    document.querySelector(".current-attendance"),
    { ...fresh, students }
  );
}

function addNewSession(course) {
  const dates = { ...(course.session_dates || {}) };
  const sessions = Object.keys(dates).map(Number);
  const next = sessions.length ? Math.max(...sessions) + 1 : 1;

  const today =
    window.AMS?.jalali?.todayJalali?.() ||
    new Date().toISOString().slice(0, 10);
  dates[next] = today;

  store.updateCourse(course.id, { session_dates: dates });

  currentSession = next;
  markSaved();
  toastSuccess(`جلسهٔ ${fa(next)} اضافه شد`);
  rerenderCurrent(course);

  /* 🔄 Sync the courses tab so session count updates */
  syncCoursesTab();
}

async function removeSession(course, sessionToRemove) {
  const ok = await confirmModal({
    title: `حذف جلسهٔ ${fa(sessionToRemove)}`,
    message:
      "این جلسه همراه با تمام حضور و نمرات ثبت‌شده حذف می‌شود و " +
      "شمارهٔ جلسات بعدی یکی کم می‌شود. این کار قابل بازگشت نیست.",
    confirmText: "حذف کن",
    cancelText: "انصراف",
  });
  if (!ok) return;

  const current = store.findCourse(course.id);
  if (!current) return;

  const oldDates = current.session_dates || {};
  const newDates = {};
  const sessionMap = {};
  let nextNum = 1;
  for (const k of Object.keys(oldDates).map(Number).sort((a, b) => a - b)) {
    if (k === sessionToRemove) continue;
    newDates[nextNum] = oldDates[k];
    sessionMap[k] = nextNum;
    nextNum++;
  }

  const oldAtt = current.attendance || {};
  const newAtt = {};
  for (const [kStr, val] of Object.entries(oldAtt)) {
    const k = Number(kStr);
    if (k === sessionToRemove) continue;
    newAtt[sessionMap[k]] = val;
  }

  const newGrades = [];
  for (const g of current.grades || []) {
    if (g.session === sessionToRemove) continue;
    newGrades.push({ ...g, session: sessionMap[g.session] || g.session });
  }

  store.updateCourse(course.id, {
    session_dates: newDates,
    attendance: newAtt,
    grades: newGrades,
  });

  const remaining = Object.keys(newDates).map(Number).sort((a, b) => a - b);
  currentSession = remaining.length
    ? Math.min(sessionToRemove, Math.max(...remaining))
    : 1;

  markSaved();
  toastSuccess(`جلسهٔ ${fa(sessionToRemove)} حذف شد`);
  rerenderCurrent(course);

  /* 🔄 Sync the courses tab so session count updates */
  syncCoursesTab();
}

/* ------------------------------------------------------------
   Toolbar (search + save status)
   ------------------------------------------------------------ */

function buildToolbar(course) {
  const box = document.createElement("div");
  box.className = "table-toolbar";

  const search = buildSearchInput({
    placeholder: "جست‌وجو در نام، فامیل، یا شمارهٔ دانشجویی...",
    onChange: (value) => {
      searchQuery = value;
      const tableWrap = document.querySelector(".attendance-table-wrap");
      if (tableWrap) {
        const fresh = store.findCourse(course.id);
        const students = store.studentsInCourse(course.id);
        const newTable = buildAttendanceTable({ ...fresh, students });
        tableWrap.replaceWith(newTable);
      }
    },
  });

  const input = search.querySelector(".search-box__input");
  if (input && searchQuery) {
    input.value = searchQuery;
    const clearBtn = search.querySelector(".search-box__clear");
    if (clearBtn) clearBtn.hidden = false;
  }

  box.appendChild(search);

  const status = document.createElement("div");
  status.className = "save-status";
  status.innerHTML = `
    <span class="save-status__dot"></span>
    <span class="save-status__text">ذخیره‌شده</span>
  `;
  box.appendChild(status);

  return box;
}

/* ------------------------------------------------------------
   Table
   ------------------------------------------------------------ */

function buildAttendanceTable(course) {
  const fresh = store.findCourse(course.id) || course;
  const students = course.students || store.studentsInCourse(course.id);

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper attendance-table-wrap";

  const table = document.createElement("table");
  table.className = "data-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const columns = [
    { key: "row",       label: "#",                cls: "col-row",       sortable: false },
    { key: "course",    label: "کد درس",           cls: "col-course",    sortable: true },
    { key: "num",       label: "شمارهٔ دانشجویی",  cls: "col-num-id",    sortable: true },
    { key: "name",      label: "نام دانشجو",       cls: "col-name",      sortable: true },
    { key: "field",     label: "رشته",             cls: "col-field",     sortable: true },
    { key: "degree",    label: "مقطع",             cls: "col-degree",    sortable: true },
    { key: "theory",    label: "ت.و.ن",            cls: "col-units",     sortable: false },
    { key: "practical", label: "ت.و.ع",            cls: "col-units",     sortable: false },
    { key: "status",    label: `وضعیت جلسهٔ ${fa(currentSession)}`, cls: "col-status", sortable: true },
    { key: "grade",     label: "نمره",             cls: "col-grade-btn", sortable: false },
  ];

  for (const col of columns) {
    const th = document.createElement("th");
    th.className = col.cls;
    if (col.sortable) {
      th.classList.add("th--sortable");
      th.innerHTML = `${col.label}<span class="sort-ind">${sortIndicator(sortState, col.key)}</span>`;
      th.title = "برای مرتب‌سازی کلیک کن";
      th.addEventListener("click", () => {
        sortState = toggleSort(sortState, col.key);
        const fresh2 = store.findCourse(course.id);
        const students2 = store.studentsInCourse(course.id);
        const newTable = buildAttendanceTable({ ...fresh2, students: students2 });
        const old = document.querySelector(".attendance-table-wrap");
        if (old) old.replaceWith(newTable);
      });
    } else {
      th.textContent = col.label;
    }
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const attendanceForSession = fresh.attendance?.[currentSession] || {};

  const filtered = filterStudents(students, searchQuery);
  const sorted = applySort(filtered, sortState, (stu, key) => {
    switch (key) {
      case "course": return stu.student_course_code || "";
      case "num":    return stu.num || "";
      case "name":   return fullName(stu.first, stu.last);
      case "field":  return stu.field || "";
      case "degree": return stu.degree || "";
      case "status": return attendanceForSession[stu.id] || "";
      default:       return stu.row || 0;
    }
  });

  if (!sorted.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = columns.length;
    td.className = "table-empty";
    td.textContent = searchQuery
      ? "دانشجویی با این جست‌وجو پیدا نشد."
      : "دانشجویی در این کلاس نیست.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    sorted.forEach((stu, i) => {
      tbody.appendChild(
        buildStudentRow(fresh, stu, i + 1, attendanceForSession)
      );
    });
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function buildStudentRow(course, stu, displayIndex, attendanceForSession) {
  const tr = document.createElement("tr");

  /* # */
  const tdRow = document.createElement("td");
  tdRow.className = "col-row";
  tdRow.textContent = fa(displayIndex);
  tr.appendChild(tdRow);

  /* Course code */
  const tdCourse = document.createElement("td");
  tdCourse.className = "col-course";
  tdCourse.textContent = fa(stu.student_course_code || course.course_code || "—");
  tr.appendChild(tdCourse);

  /* Student number */
  const tdNum = document.createElement("td");
  tdNum.className = "col-num-id";
  tdNum.textContent = fa(stu.num);
  tr.appendChild(tdNum);

  /* Name (clickable) */
  const tdName = document.createElement("td");
  tdName.className = "col-name";
  const nameBtn = document.createElement("button");
  nameBtn.className = "student-link";
  nameBtn.textContent = fullName(stu.first, stu.last);
  nameBtn.title = "مشاهدهٔ نمرات و حضور";
  nameBtn.addEventListener("click", () => openStudentModal(course, stu));
  tdName.appendChild(nameBtn);
  tr.appendChild(tdName);

  /* Field */
  const tdField = document.createElement("td");
  tdField.className = "col-field";
  tdField.textContent = stu.field || "—";
  tr.appendChild(tdField);

  /* Degree */
  const tdDegree = document.createElement("td");
  tdDegree.className = "col-degree";
  tdDegree.textContent = stu.degree || "—";
  tr.appendChild(tdDegree);

  /* Theory units */
  const tdTheory = document.createElement("td");
  tdTheory.className = "col-units";
  tdTheory.textContent =
    typeof stu.theoretical_units === "number" ? fa(stu.theoretical_units) : "—";
  tr.appendChild(tdTheory);

  /* Practical units */
  const tdPractical = document.createElement("td");
  tdPractical.className = "col-units";
  tdPractical.textContent =
    typeof stu.practical_units === "number" ? fa(stu.practical_units) : "—";
  tr.appendChild(tdPractical);

  /* Status buttons */
  const tdStatus = document.createElement("td");
  tdStatus.className = "col-status";
  tdStatus.appendChild(
    buildStatusButtons(course, stu, attendanceForSession[stu.id])
  );
  tr.appendChild(tdStatus);

  /* Grade button */
  const tdGrade = document.createElement("td");
  tdGrade.className = "col-grade-btn";
  const gradeBtn = document.createElement("button");
  gradeBtn.className = "btn btn--sm";
  gradeBtn.textContent = "📝";
  gradeBtn.title = `ثبت نمره برای جلسهٔ ${fa(currentSession)}`;
  gradeBtn.addEventListener("click", () => {
    openGradeModal({
      course,
      student: stu,
      session: currentSession,
    });
  });
  tdGrade.appendChild(gradeBtn);
  tr.appendChild(tdGrade);

  return tr;
}

/* ------------------------------------------------------------
   Status buttons
   ------------------------------------------------------------ */

const STATUSES = [
  { key: "present", symbol: "✓", label: "حاضر",  cls: "present" },
  { key: "absent",  symbol: "✗", label: "غایب",  cls: "absent"  },
  { key: "late",    symbol: "ت", label: "تأخیر", cls: "late"    },
  { key: "excused", symbol: "م", label: "مرخصی", cls: "excused" },
];

function buildStatusButtons(course, student, currentStatus) {
  const group = document.createElement("div");
  group.className = "status-group";

  for (const s of STATUSES) {
    const btn = document.createElement("button");
    btn.className = `status-btn status-btn--${s.cls}`;
    if (currentStatus === s.key) btn.classList.add("status-btn--active");
    btn.textContent = s.symbol;
    btn.title = s.label;
    btn.addEventListener("click", () =>
      setStatus(course, student.id, s.key, group)
    );
    group.appendChild(btn);
  }

  return group;
}

function setStatus(course, studentId, status, group) {
  group
    .querySelectorAll(".status-btn")
    .forEach((b) => b.classList.remove("status-btn--active"));
  group
    .querySelector(`.status-btn--${status}`)
    .classList.add("status-btn--active");

  const fresh = store.findCourse(course.id);
  if (!fresh) return;

  const attendance = { ...(fresh.attendance || {}) };
  const sessionMap = { ...(attendance[currentSession] || {}) };

  if (sessionMap[studentId] === status) {
    delete sessionMap[studentId];
    group
      .querySelector(`.status-btn--${status}`)
      .classList.remove("status-btn--active");
  } else {
    sessionMap[studentId] = status;
  }

  attendance[currentSession] = sessionMap;
  store.updateCourse(course.id, { attendance });

  markDirty();
  scheduleSaveToast();

  const summary = document.querySelector(".attendance-summary");
  if (summary) renderSummaryInto(summary, { ...fresh, attendance });

  if (sortState.key === "status") {
    const students = store.studentsInCourse(course.id);
    const newTable = buildAttendanceTable({
      ...fresh,
      attendance,
      students,
    });
    const old = document.querySelector(".attendance-table-wrap");
    if (old) old.replaceWith(newTable);
  }
}

/* ------------------------------------------------------------
   Save state
   ------------------------------------------------------------ */

function markDirty() {
  dirty = true;
  updateSaveStatus("در حال ذخیره...");
}

function markSaved() {
  dirty = false;
  lastSavedAt = Date.now();
  updateSaveStatus("ذخیره‌شده");
}

function updateSaveStatus(text) {
  const el = document.querySelector(".save-status");
  if (!el) return;
  const dot = el.querySelector(".save-status__dot");
  const txt = el.querySelector(".save-status__text");
  if (txt) txt.textContent = text;
  if (dot) dot.classList.toggle("save-status__dot--dirty", dirty);
}

function scheduleSaveToast() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    markSaved();
    toastSuccess("ذخیره شد");
    saveTimer = null;
  }, 500);
}

/* ------------------------------------------------------------
   Summary
   ------------------------------------------------------------ */

function buildSummary(course) {
  const box = document.createElement("div");
  box.className = "attendance-summary";
  renderSummaryInto(box, course);
  return box;
}

function renderSummaryInto(box, course) {
  const students = course.students || store.studentsInCourse(course.id);
  const map = course.attendance?.[currentSession] || {};
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  let unset = 0;

  for (const stu of students) {
    const s = map[stu.id];
    if (s && counts[s] !== undefined) {
      counts[s]++;
    } else {
      counts.absent++;
      unset++;
    }
  }

  const total = students.length;
  const attended = counts.present + counts.late;
  const percent = total ? Math.round((attended / total) * 100) : 0;

  box.innerHTML = `
    <div class="summary-row">
      <span class="summary-item summary-item--present">حاضر: <b>${fa(counts.present)}</b></span>
      <span class="summary-item summary-item--absent">غایب: <b>${fa(counts.absent)}</b></span>
      <span class="summary-item summary-item--late">تأخیر: <b>${fa(counts.late)}</b></span>
      <span class="summary-item summary-item--excused">مرخصی: <b>${fa(counts.excused)}</b></span>
      <span class="summary-item summary-item--percent">درصد حضور: <b>${fa(percent)}٪</b></span>
    </div>
    ${unset ? `<div class="summary-hint">${fa(unset)} دانشجو ثبت نشده — به‌عنوان غایب حساب می‌شن.</div>` : ""}
    <div class="summary-actions">
      <button class="btn btn--primary" data-action="save">ذخیره</button>
      <button class="btn" data-action="clear">پاک کردن این جلسه</button>
    </div>
  `;

  box.querySelector('[data-action="save"]').addEventListener("click", () => {
    markSaved();
    toastSuccess("ذخیره شد");
  });

  box
    .querySelector('[data-action="clear"]')
    .addEventListener("click", async () => {
      const ok = await confirmModal({
        title: "پاک کردن جلسه",
        message: `همهٔ وضعیت‌های حضور جلسهٔ ${fa(currentSession)} پاک می‌شن. مطمئنی؟`,
        confirmText: "پاک کن",
        cancelText: "انصراف",
      });
      if (!ok) return;

      const fresh = store.findCourse(course.id);
      if (!fresh) return;
      const attendance = { ...(fresh.attendance || {}) };
      delete attendance[currentSession];
      store.updateCourse(course.id, { attendance });
      markSaved();
      toastSuccess("جلسه پاک شد");
      rerenderCurrent(course);

      /* 🔄 Sync courses tab (in case summary counters matter) */
      syncCoursesTab();
    });
}

/* ------------------------------------------------------------
   Warn on unsaved changes
   ------------------------------------------------------------ */

window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});