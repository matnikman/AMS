/* ============================================================
   AMS — PDF import UI
   Upload → parse → preview (editable) → confirm.
   Converts parsed PDF data into students + course + enrollments.
   ============================================================ */

import { extractPdf } from "../import/pdfLoader.js";
import { parsePdf } from "../import/pdfParser.js";
import * as store from "../data/store.js";
import { toastSuccess, toastError } from "../core/toast.js";
import { fa } from "../core/numbers.js";
import { renderCourseList } from "./courseList.js";
import { setTab } from "./tabs.js";

const isPdf = (file) =>
  !!file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name || ""));

/* ------------------------------------------------------------
   Modal
   ------------------------------------------------------------ */

export function openImportModal() {
  pendingData = null;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true">
      <div class="modal__header">
        <h3 class="modal__title">افزودن کلاس از PDF</h3>
        <button class="btn btn--ghost" data-action="close">بستن</button>
      </div>

      <div class="import-dropzone" data-action="drop">
        <div class="import-dropzone__icon">📄</div>
        <div class="import-dropzone__title">فایل PDF رو اینجا بکش و رها کن</div>
        <div class="import-dropzone__hint">یا</div>
        <button class="btn btn--primary" data-action="pick">انتخاب فایل</button>
        <input type="file" accept="application/pdf,.pdf" hidden data-input />
      </div>

      <div class="import-progress" hidden>
        <div class="import-progress__bar"></div>
        <div class="import-progress__text">در حال خواندن PDF...</div>
      </div>

      <div class="import-preview" hidden></div>

      <div class="import-actions" hidden>
        <button class="btn" data-action="cancel">انصراف</button>
        <button class="btn btn--primary" data-action="confirm">ذخیرهٔ کلاس</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();

  overlay.querySelector('[data-action="close"]').addEventListener("click", close);
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const input = overlay.querySelector("[data-input]");
  overlay
    .querySelector('[data-action="pick"]')
    .addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0];
    input.value = "";
    if (file) handleFile(file, overlay);
  });

  const dropzone = overlay.querySelector('[data-action="drop"]');
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("import-dropzone--active");
  });
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("import-dropzone--active");
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("import-dropzone--active");
    const file = e.dataTransfer.files[0];
    if (isPdf(file)) handleFile(file, overlay);
    else toastError("فقط فایل PDF مجازه.");
  });

  document.body.appendChild(overlay);
}

/* ------------------------------------------------------------
   Handle file
   ------------------------------------------------------------ */

async function handleFile(file, overlay) {
  const dropzone = overlay.querySelector(".import-dropzone");
  const progress = overlay.querySelector(".import-progress");
  const preview = overlay.querySelector(".import-preview");
  const actions = overlay.querySelector(".import-actions");

  dropzone.hidden = true;
  progress.hidden = false;
  preview.hidden = true;
  actions.hidden = true;

  const progressText = progress.querySelector(".import-progress__text");
  const progressBar = progress.querySelector(".import-progress__bar");

  try {
    progressText.textContent = "در حال خواندن PDF...";
    progressBar.style.width = "10%";

    const extracted = await extractPdf(file, (done, total) => {
      progressBar.style.width = `${10 + Math.round((70 * done) / total)}%`;
    });

    progressText.textContent = "در حال استخراج اطلاعات...";
    progressBar.style.width = "90%";

    const { header, students, warnings } = parsePdf(extracted);

    progressBar.style.width = "100%";
    progressText.textContent = "آماده!";

    if (!students.length) {
      toastError("هیچ دانشجویی تو این PDF پیدا نشد.");
      dropzone.hidden = false;
      progress.hidden = true;
      return;
    }

    progress.hidden = true;
    renderPreview(overlay, header, students, warnings);
  } catch (err) {
    console.error(err);
    toastError(err.message || "خطا در خواندن PDF");
    dropzone.hidden = false;
    progress.hidden = true;
  }
}

/* ------------------------------------------------------------
   Preview
   ------------------------------------------------------------ */

let pendingData = null;

function renderPreview(overlay, header, students, warnings = []) {
  const preview = overlay.querySelector(".import-preview");
  const actions = overlay.querySelector(".import-actions");

  const courseDraft = {
    course_code: header.course_code || "",
    class_code: header.class_code || "",
    course_name: header.course_name || "بدون نام",
    teacher_name: header.teacher_name || "",
    class_time: header.class_time || "",
    exam_time: header.exam_time || "",
    class_location: header.class_location || "",
    department: header.department || "",
    faculty: header.faculty || "",
    semester: header.semester || "",
  };

  const studentDrafts = students.map((s, i) => ({
    row: s.row || i + 1,
    num: s.num,
    first: s.first || "",
    last: s.last || "",
    field: s.field || "",
    degree: s.degree || "",
    system: s.system || "",
    status: s.status || "اصلی",
    student_course_code: s.student_course_code || header.course_code || "",
    theoretical_units: s.theoretical_units,
    practical_units: s.practical_units,
    entry_year: s.entry_year,
  }));

  pendingData = { courseDraft, studentDrafts };

  const warningsHtml = warnings.length
    ? `
    <div class="import-warnings" role="alert">
      <strong>بررسی کن:</strong>
      <ul>
        ${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}
      </ul>
    </div>`
    : "";

  const editable = (idx, key, value) =>
    `<input class="form-field__input" data-sidx="${idx}" data-sfield="${key}" value="${escapeHtml(value ?? "")}" />`;

  preview.innerHTML = `
    ${warningsHtml}
    <div class="preview-header">
      <div class="section-title"><span>اطلاعات کلاس</span></div>
      <div class="preview-grid">
        <label class="form-field">
          <span class="form-field__label">کد درس</span>
          <input class="form-field__input" data-ckey="course_code" value="${escapeHtml(courseDraft.course_code)}" />
        </label>
        <label class="form-field">
          <span class="form-field__label">کد ارائه کلاس</span>
          <input class="form-field__input" data-ckey="class_code" value="${escapeHtml(courseDraft.class_code)}" />
        </label>
        <label class="form-field">
          <span class="form-field__label">نام درس</span>
          <input class="form-field__input" data-ckey="course_name" value="${escapeHtml(courseDraft.course_name)}" />
        </label>
        <label class="form-field">
          <span class="form-field__label">نام مدرس</span>
          <input class="form-field__input" data-ckey="teacher_name" value="${escapeHtml(courseDraft.teacher_name)}" />
        </label>
        <label class="form-field">
          <span class="form-field__label">زمان برگزاری کلاس</span>
          <input class="form-field__input" data-ckey="class_time" value="${escapeHtml(courseDraft.class_time)}" />
        </label>
        <label class="form-field">
          <span class="form-field__label">زمان برگزاری امتحان</span>
          <input class="form-field__input" data-ckey="exam_time" value="${escapeHtml(courseDraft.exam_time)}" />
        </label>
        <label class="form-field">
          <span class="form-field__label">مکان کلاس</span>
          <input class="form-field__input" data-ckey="class_location" value="${escapeHtml(courseDraft.class_location)}" />
        </label>
      </div>
    </div>

    <div class="section-title">
      <span>دانشجوها (${fa(studentDrafts.length)})</span>
    </div>
    <div class="table-wrapper preview-students">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-row">#</th>
            <th class="col-num-id">شمارهٔ دانشجویی</th>
            <th class="col-first">نام</th>
            <th class="col-last">نام خانوادگی</th>
            <th class="col-field">رشته</th>
            <th class="col-degree">مقطع</th>
            <th class="col-units">ت.و.ن</th>
            <th class="col-units">ت.و.ع</th>
          </tr>
        </thead>
        <tbody>
          ${studentDrafts
            .map(
              (s, i) => `
            <tr>
              <td class="col-row">${fa(s.row)}</td>
              <td class="col-num-id">${fa(s.num)}</td>
              <td class="col-first">${editable(i, "first", s.first)}</td>
              <td class="col-last">${editable(i, "last", s.last)}</td>
              <td class="col-field">${editable(i, "field", s.field)}</td>
              <td class="col-degree">${editable(i, "degree", s.degree)}</td>
              <td class="col-units">${typeof s.theoretical_units === "number" ? fa(s.theoretical_units) : "—"}</td>
              <td class="col-units">${typeof s.practical_units === "number" ? fa(s.practical_units) : "—"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  preview.querySelectorAll("[data-ckey]").forEach((input) => {
    input.addEventListener("input", () => {
      courseDraft[input.dataset.ckey] = input.value.trim();
    });
  });

  preview.querySelectorAll("[data-sidx]").forEach((input) => {
    input.addEventListener("input", () => {
      const s = studentDrafts[Number(input.dataset.sidx)];
      if (s) s[input.dataset.sfield] = input.value.trim();
    });
  });

  preview.hidden = false;
  actions.hidden = false;

  overlay.querySelector('[data-action="confirm"]').onclick = () => confirmImport(overlay);
}

/* ------------------------------------------------------------
   Confirm — write to store
   ------------------------------------------------------------ */

function confirmImport(overlay) {
  if (!pendingData) return;

  const { courseDraft, studentDrafts } = pendingData;

  if (!courseDraft.course_name || courseDraft.course_name === "بدون نام") {
    toastError("نام درس رو وارد کن.");
    return;
  }

  /* Duplicate check */
  const existing = store.loadCourses().find(
    (c) =>
      c.class_code &&
      c.class_code === courseDraft.class_code &&
      c.course_code === courseDraft.course_code
  );
  if (
    existing &&
    !window.confirm("این کلاس (با همین کد ارائه) قبلاً ذخیره شده. دوباره اضافه بشه؟")
  ) {
    return;
  }

  /* 1. Create the course */
  const courseId = `c${Date.now()}`;
  const course = {
    id: courseId,
    course_code: courseDraft.course_code,
    class_code: courseDraft.class_code,
    course_name: courseDraft.course_name,
    teacher_name: courseDraft.teacher_name,
    class_time: courseDraft.class_time,
    exam_time: courseDraft.exam_time,
    class_location: courseDraft.class_location,
    class_status: "",
    department: courseDraft.department,
    faculty: courseDraft.faculty,
    semester: courseDraft.semester,
    student_count: studentDrafts.length,
    week_count: 16,
    week_display: "number",
    session_dates: {},
    attendance: {},
    grades: [],
  };
  store.addCourse(course);

  /* 2. Upsert each student and enroll them */
  for (const s of studentDrafts) {
    const student = store.upsertStudent({
      num: s.num,
      first: s.first,
      last: s.last,
      field: s.field,
      degree: s.degree,
      system: s.system,
      student_course_code: s.student_course_code,
      theoretical_units: s.theoretical_units,
      practical_units: s.practical_units,
      entry_year: s.entry_year,
    });
    if (!student) continue;
    store.enroll(student.id, courseId, s.status || "اصلی");
  }

  toastSuccess(
    `کلاس «${course.course_name}» با ${fa(studentDrafts.length)} دانشجو ذخیره شد.`
  );
  overlay.remove();
  renderCourseList();
  setTab("courses");
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