/* ============================================================
   AMS — Students tab
   Global list of all students, aggregated across courses.
   Filter by course/field, sort by name/number/attendance/avg.
   ============================================================ */

import * as store from "../data/store.js";
import { fa } from "../core/numbers.js";
import { fullName } from "../utils/format.js";
import { buildSearchInput, normalize } from "./search.js";
import { openStudentModal } from "./studentModal.js";
import { setSelectedCourseId } from "./courseList.js";
import { setTab } from "./tabs.js";
import { openAddStudentModal } from "./addStudentModal.js";
import {
  recordsForStudent,
  studentAverage,
  formatGradeOrDash,
} from "../core/grades.js";

/* ------------------------------------------------------------
   State
   ------------------------------------------------------------ */

let searchQuery = "";
let filterCourseId = "";
let filterField = "";
let sortBy = "name";   /* name | num | attendance | average */

/* ------------------------------------------------------------
   Render
   ------------------------------------------------------------ */

export function renderStudents() {
  const panel = document.getElementById("tab-students");
  if (!panel) return;

  /* Preserve scroll and search input on re-render */
  const oldScroll = panel.querySelector(".students-list")?.scrollTop || 0;

  panel.innerHTML = "";

  const students = buildAggregatedStudents();

  /* Header */
  const header = document.createElement("div");
  header.className = "section-title";
  header.innerHTML = `<span>دانشجویان (${fa(students.length)})</span>`;

  const addBtn = document.createElement("button");
  addBtn.className = "btn btn--primary";
  addBtn.textContent = "+ افزودن دانشجو";
  addBtn.addEventListener("click", () => {
    /* null course → user picks from a dropdown (or none) */
    openAddStudentModal(null, () => {
      renderStudents();
    });
  });
  header.appendChild(addBtn);
  panel.appendChild(header);

  /* Empty state */
  if (!students.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state__icon">👥</div>
      <div class="empty-state__title">هنوز دانشجویی ثبت نشده</div>
      <div class="empty-state__hint">با افزودن PDF از پنل استاد، دانشجوها اضافه می‌شن.</div>
    `;
    panel.appendChild(empty);
    return;
  }

  /* Toolbar */
  panel.appendChild(buildToolbar());

  /* List */
  const listBox = document.createElement("div");
  listBox.className = "students-list";
  panel.appendChild(listBox);

  const filtered = applyFilters(students);
  const sorted = applySort(filtered);

  if (!sorted.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state__title">دانشجویی با این فیلترها پیدا نشد</div>
    `;
    listBox.appendChild(empty);
  } else {
    for (const s of sorted) {
      listBox.appendChild(buildStudentCard(s));
    }
  }

  /* Restore scroll */
  listBox.scrollTop = oldScroll;
}

/* ------------------------------------------------------------
   Aggregation
   ------------------------------------------------------------ */

/**
 * Build a list of unique students with aggregated stats:
 *   {
 *     ...student,
 *     courses: [ {id, course_name, class_code, ...} ],
 *     attendancePercent: number,
 *     average: number | null,
 *   }
 */
function buildAggregatedStudents() {
  const students = store.loadStudents();
  const allCourses = store.loadCourses();

  return students.map((s) => {
    const courses = store.coursesForStudent(s.id);

    /* Attendance: average across all courses */
    let totalAttended = 0;
    let totalSessions = 0;
    let gradeSum = 0;
    let gradeCount = 0;

    for (const c of courses) {
      const sessions = Object.keys(c.session_dates || {}).length;
      if (sessions) {
        const att = c.attendance || {};
        let present = 0;
        for (const sess of Object.keys(att)) {
          const st = att[sess]?.[s.id];
          if (st === "present" || st === "late") present++;
        }
        totalAttended += present;
        totalSessions += sessions;
      }

      const records = recordsForStudent(c.grades || [], s.id);
      for (const r of records) {
        if (typeof r.value === "number") {
          gradeSum += r.value;
          gradeCount++;
        }
      }
    }

    const attendancePercent = totalSessions
      ? Math.round((totalAttended / totalSessions) * 100)
      : null;

    const average = gradeCount
      ? Math.round((gradeSum / gradeCount) * 100) / 100
      : null;

    return {
      ...s,
      courses,
      attendancePercent,
      average,
    };
  });
}

/* ------------------------------------------------------------
   Toolbar (search + filters + sort)
   ------------------------------------------------------------ */

function buildToolbar() {
  const box = document.createElement("div");
  box.className = "students-toolbar";

  /* Search */
  const search = buildSearchInput({
    placeholder: "جست‌وجو در نام، فامیل، شماره، یا رشته...",
    onChange: (value) => {
      searchQuery = value;
      rerenderList();
    },
  });
  const input = search.querySelector(".search-box__input");
  if (input && searchQuery) {
    input.value = searchQuery;
    const clearBtn = search.querySelector(".search-box__clear");
    if (clearBtn) clearBtn.hidden = false;
  }
  box.appendChild(search);

  /* Filters row */
  const filters = document.createElement("div");
  filters.className = "students-filters";

  /* Course filter */
  const courses = store.loadCourses();
  filters.appendChild(
    buildSelect({
      label: "کلاس",
      value: filterCourseId,
      options: [
        { value: "", label: "همه" },
        ...courses.map((c) => ({
          value: c.id,
          label: `${c.course_name} (${c.class_code || "—"})`,
        })),
      ],
      onChange: (v) => {
        filterCourseId = v;
        rerenderList();
      },
    })
  );

  /* Field filter */
  const fields = collectFields();
  filters.appendChild(
    buildSelect({
      label: "رشته",
      value: filterField,
      options: [
        { value: "", label: "همه" },
        ...fields.map((f) => ({ value: f, label: f })),
      ],
      onChange: (v) => {
        filterField = v;
        rerenderList();
      },
    })
  );

  /* Sort */
  filters.appendChild(
    buildSelect({
      label: "مرتب‌سازی",
      value: sortBy,
      options: [
        { value: "name",       label: "نام (الفبا)" },
        { value: "num",        label: "شمارهٔ دانشجویی" },
        { value: "attendance", label: "درصد حضور" },
        { value: "average",    label: "میانگین نمرات" },
      ],
      onChange: (v) => {
        sortBy = v;
        rerenderList();
      },
    })
  );

  box.appendChild(filters);
  return box;
}

function buildSelect({ label, value, options, onChange }) {
  const wrap = document.createElement("label");
  wrap.className = "filter-field";

  const lbl = document.createElement("span");
  lbl.className = "filter-field__label";
  lbl.textContent = label;
  wrap.appendChild(lbl);

  const sel = document.createElement("select");
  sel.className = "filter-field__select";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === value) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => onChange(sel.value));
  wrap.appendChild(sel);

  return wrap;
}

function collectFields() {
  const set = new Set();
  for (const s of store.loadStudents()) {
    if (s.field) set.add(s.field);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "fa"));
}

/* ------------------------------------------------------------
   Filter + sort
   ------------------------------------------------------------ */

function applyFilters(list) {
  const q = normalize(searchQuery);

  return list.filter((s) => {
    /* Course filter */
    if (filterCourseId) {
      const inCourse = s.courses.some((c) => c.id === filterCourseId);
      if (!inCourse) return false;
    }

    /* Field filter */
    if (filterField && s.field !== filterField) return false;

    /* Search */
    if (q) {
      const haystack = [
        s.first,
        s.last,
        `${s.first} ${s.last}`,
        s.num,
        s.field,
        s.degree,
      ]
        .map(normalize)
        .join(" ");
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

function applySort(list) {
  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "num":
        return String(a.num).localeCompare(String(b.num), "fa");
      case "attendance": {
        const av = a.attendancePercent ?? -1;
        const bv = b.attendancePercent ?? -1;
        return bv - av; /* higher first */
      }
      case "average": {
        const av = a.average ?? -1;
        const bv = b.average ?? -1;
        return bv - av; /* higher first */
      }
      case "name":
      default:
        return fullName(a.first, a.last).localeCompare(
          fullName(b.first, b.last),
          "fa"
        );
    }
  });
  return sorted;
}

/* ------------------------------------------------------------
   Student card
   ------------------------------------------------------------ */

function buildStudentCard(s) {
  const card = document.createElement("div");
  card.className = "student-card";

  const academic = [s.field, s.degree, s.system]
    .filter(Boolean)
    .join(" / ");

  /* Stats row */
  const courseCount = s.courses.length;
  const attText =
    s.attendancePercent === null ? "—" : fa(s.attendancePercent) + "٪";
  const avgText = formatGradeOrDash(s.average) || "—";

  /* Warning: low attendance */
  const lowAttendance =
    s.attendancePercent !== null && s.attendancePercent < 50;

  card.innerHTML = `
    <div class="student-card__header">
      <div>
        <button class="student-card__name" data-action="details">${escapeHtml(
          fullName(s.first, s.last)
        )}</button>
        <div class="student-card__num">${fa(s.num)}</div>
        ${academic ? `<div class="student-card__academic">${escapeHtml(academic)}</div>` : ""}
      </div>
      <div class="student-card__actions">
        <button class="btn btn--sm" data-action="details">جزئیات</button>
      </div>
    </div>

    <div class="student-card__stats">
      <div class="student-stat">
        <span class="student-stat__icon">📚</span>
        <span class="student-stat__value">${fa(courseCount)}</span>
        <span class="student-stat__label">کلاس</span>
      </div>
      <div class="student-stat ${lowAttendance ? "student-stat--warn" : ""}">
        <span class="student-stat__icon">✋</span>
        <span class="student-stat__value">${attText}</span>
        <span class="student-stat__label">حضور</span>
      </div>
      <div class="student-stat">
        <span class="student-stat__icon">📝</span>
        <span class="student-stat__value">${avgText}</span>
        <span class="student-stat__label">میانگین</span>
      </div>
    </div>

    ${
      s.courses.length
        ? `
      <div class="student-card__courses">
        <div class="student-card__courses-label">کلاس‌ها:</div>
        <div class="course-chips">
          ${s.courses
            .map(
              (c) => `
            <button class="course-chip" data-course-id="${escapeHtml(c.id)}">
              ${escapeHtml(c.course_name)}
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `
        : ""
    }
  `;

  /* Details */
  card.querySelectorAll('[data-action="details"]').forEach((el) => {
    el.addEventListener("click", () => {
      /* Find a course for the modal context, or use a synthetic one */
      const courseId = s.courses[0]?.id;
      if (!courseId) return;
      const course = store.findCourse(courseId);
      if (!course) return;
      openStudentModal({ ...course, students: store.studentsInCourse(courseId) }, s);
    });
  });

  /* Course chips */
  card.querySelectorAll(".course-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const cid = chip.dataset.courseId;
      if (!cid) return;
      setSelectedCourseId(cid);
      setTab("current");
    });
  });

  return card;
}

/* ------------------------------------------------------------
   Re-render only the list (not the toolbar)
   ------------------------------------------------------------ */

function rerenderList() {
  const panel = document.getElementById("tab-students");
  if (!panel) return;

  const listBox = panel.querySelector(".students-list");
  if (!listBox) return;

  const students = buildAggregatedStudents();
  const filtered = applyFilters(students);
  const sorted = applySort(filtered);

  listBox.innerHTML = "";

  if (!sorted.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-state__title">دانشجویی با این فیلترها پیدا نشد</div>
    `;
    listBox.appendChild(empty);
    return;
  }

  for (const s of sorted) {
    listBox.appendChild(buildStudentCard(s));
  }
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