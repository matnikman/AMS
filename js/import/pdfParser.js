/* ============================================================
   AMS — PDF parser
   Parse the university attendance-sheet PDF
   ("لیست حضور و غیاب کلاس‌های مجتمع", term 4051).
   Extracts: header (course/teacher/time) and student table.

   Strategy (all layout-based, per page):
     1. Normalize Arabic/Persian chars + known PDF text glitches.
     2. Header  : find "label:" items, value = items to its left on the same row.
     3. Table   : columns come from the table-header cells (with fallbacks);
                  rows come from the student-number cells (vertical bands),
                  so multi-line cells (field, status, long family names) stay together.
     4. Validate: count vs header, row sequence, duplicates -> warnings.

   Place at: js/import/pdfParser.js
   ============================================================ */

/* ------------------------------------------------------------
   Config
   ------------------------------------------------------------ */

/**
 * The PDF's text layer DROPS the alef in lam-alef ("لا") inside some words,
 * e.g. "بغلانی" is stored as "بغلنی". This cannot be detected generically,
 * so add known corrections here (key = text as extracted, value = correct text).
 * The preview table is editable too, so you can also fix names by hand.
 */
export const NAME_FIXES = {
  "بغلنی اصل": "بغلانی اصل",
};

/* Column centers (x) measured on a 612pt-wide page; used only when a
   table-header cell cannot be found. Scaled by page width. */
const DEFAULT_COLS = {
  code: 553,
  status: 520,
  number: 474,
  family: 417,
  name: 369,
  field: 288,
};

/* ------------------------------------------------------------
   Text normalization
   ------------------------------------------------------------ */

export function normalizeFa(s) {
  return String(s ?? "")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "") /* bidi marks */
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "") /* harakat + tatweel */
    .replace(/ك/g, "ک")
    .replace(/[يى]/g, "ی")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* "کلس" -> "کلاس" (alef lost in the PDF). Whole word only. */
function fixGlitches(s) {
  return s.replace(/(^|[^\u0600-\u06FF])کلس(?![\u0600-\u06FF])/g, "$1کلاس");
}

const clean = (s) => fixGlitches(normalizeFa(s));

function fixName(s) {
  return NAME_FIXES[s] ?? s;
}

/**
 * Extract the entry year from a student number.
 * "404727823" -> 1404 ; "411874203406" -> 1411
 * Returns null if the input is too short.
 */
function entryYearFromNum(num) {
  const m = String(num || "").match(/^(\d{3})/);
  return m ? Number("1" + m[1]) : null;
}

/* ------------------------------------------------------------
   Geometry helpers
   ------------------------------------------------------------ */

const cx = (it) => it.x + (it.w || 0) / 2;

function groupLines(items, tol = 3) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const lines = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(it.y - last.y) <= tol) {
      last.items.push(it);
    } else {
      lines.push({ y: it.y, items: [it] });
    }
  }
  for (const l of lines) l.items.sort((a, b) => cx(b) - cx(a));
  return lines;
}

function joinCell(items) {
  return groupLines(items, 3)
    .map((l) => l.items.map((it) => it.str).join(" "))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------
   Header parsing
   ------------------------------------------------------------ */

const HEADER_LABELS = [
  ["class_code", /^کد ارائه کلاس درس$/],
  ["course_code", /^کد درس$/],
  ["course_name", /^نام درس$/],
  ["teacher_name", /^نام مدرس$/],
  ["student_count", /^تعداد دانشجو$/],
  ["class_time", /^زمان برگزاری کلاس$/],
  ["exam_time", /^زمان برگزاری امتحان$/],
  ["class_location", /^مکان کلاس$/],
];

function labelKey(str) {
  if (!/[:：]\s*$/.test(str)) return null;
  const bare = str.replace(/\s*[:：]\s*$/, "").trim();
  for (const [key, re] of HEADER_LABELS) if (re.test(bare)) return key;
  return null;
}

function findTableHeaderCells(items) {
  const h = {};
  for (const it of items) {
    switch (it.str) {
      case "کد درس": h.code = it; break;
      case "وضعیت": h.status = it; break;
      case "شماره دانشجویی": h.number = it; break;
      case "نام خانوادگی": h.family = it; break;
      case "نام": h.name = it; break;
      case "رشته/مقطع/سیستم": h.field = it; break;
      case "هفته تحصیلی": h.week = it; break;
    }
  }
  return h;
}

function cleanTime(s) {
  return String(s || "")
    .replace(/[؛;:]+\s*$/, "")
    .replace(/^\s*[؛;:]+/, "")
    .replace(/(\d)\s*:\s*(\d)/g, "$1:$2")
    .replace(/\s+/g, " ")
    .trim();
}

function parseExamTime(raw) {
  const s = cleanTime(raw);
  if (!s) return "";

  let date = "";
  const d = s.match(/(\d{1,4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,4})/);
  if (d) {
    const [, a, b, c] = d;
    const pad = (n) => String(n).padStart(2, "0");
    if (a.length === 4) date = `${a}/${pad(b)}/${pad(c)}`;
    else if (c.length === 4) date = `${c}/${pad(b)}/${pad(a)}`;
  }

  const t = s.match(/(\d{1,2}:\d{2})\s*تا\s*(\d{1,2}:\d{2})/);
  const time = t ? `${t[1]} تا ${t[2]}` : "";

  if (date && time) return `${date} - ${time}`;
  return date || time || s;
}

export function parseHeader(page) {
  const items = page.items;
  const th = findTableHeaderCells(items);
  const zoneBottom = (th.week?.y ?? th.number?.y ?? 175) - 5;

  const zone = items.filter((it) => it.y > 60 && it.y < zoneBottom);

  const out = {};
  for (const line of groupLines(zone, 3.5)) {
    let current = null;
    for (const it of line.items) {
      const key = labelKey(it.str);
      if (key) {
        current = key;
        out[key] = out[key] ?? [];
      } else if (current) {
        out[current].push(it.str);
      }
    }
  }
  const val = (k) => (out[k] || []).join(" ").trim();

  let faculty = "";
  let department = "";
  for (const it of items) {
    if (it.y < 60 || it.y > zoneBottom) continue;
    let m = it.str.match(/^دانشکده\s*(.+)$/);
    if (m && !faculty) faculty = m[1].trim();
    m = it.str.match(/^(?:گروه\s+)+(?:آموزشی\s+)?(.+)$/);
    if (m && !department) department = m[1].trim();
  }

  let semester = "";
  let print_date = "";
  for (const it of items) {
    const m = it.str.match(/نیمسال\s*(\d+)/);
    if (m && !semester) semester = m[1];
    if (it.y < 30 && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(it.str)) print_date = it.str;
  }

  const count = val("student_count").match(/\d+/);

  return {
    course_code: (val("course_code").match(/\d{6,}/) || [""])[0],
    class_code: (val("class_code").match(/\d{3,}/) || [""])[0],
    course_name: val("course_name"),
    teacher_name: val("teacher_name"),
    class_time: cleanTime(val("class_time")),
    exam_time: parseExamTime(val("exam_time")),
    class_location: val("class_location"),
    department,
    faculty,
    student_count: count ? Number(count[0]) : null,
    semester,
    print_date,
  };
}

/* ------------------------------------------------------------
   Student table parsing
   ------------------------------------------------------------ */

function getBodyTop(items) {
  const h = findTableHeaderCells(items);
  const ys = Object.values(h).map((it) => it.y);
  return ys.length ? Math.max(...ys) + 3 : 175;
}

function getColumns(items, pageWidth) {
  const h = findTableHeaderCells(items);
  const k = (pageWidth || 612) / 612;
  const pick = (key) => (h[key] ? cx(h[key]) : DEFAULT_COLS[key] * k);
  return {
    code: pick("code"),
    status: pick("status"),
    number: pick("number"),
    family: pick("family"),
    name: pick("name"),
    field: pick("field"),
  };
}

function classify(it, cols) {
  const c = cx(it);

  if (/^\d{1,2}$/.test(it.str) && c < cols.field - 50 && c > cols.field - 150) {
    return "units";
  }
  if (/^\d{1,3}$/.test(it.str) && c > cols.code + 15) return "index";

  let best = null;
  let bestD = Infinity;
  for (const [k, v] of Object.entries(cols)) {
    const d = Math.abs(c - v);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return bestD <= 30 ? best : null;
}

/**
 * Split "مهندسی شیمی / کارشناسی پیوسته / -" into parts.
 * "-" becomes an empty string (per the user's requirement).
 */
function splitFieldInfo(str) {
  if (!str) return { field: "", degree: "", system: "" };
  const parts = str.split("/").map((p) => p.trim());
  const field = parts[0] || "";
  const degree = parts[1] || "";
  let system = parts[2] || "";
  if (system === "-") system = "";
  return { field, degree, system };
}

function entryYear(num) {
  const y = entryYearFromNum(num);
  if (y === null || y === undefined || y === "" || Number.isNaN(y)) {
    const m = String(num).match(/^(\d{3})/);
    return m ? Number("1" + m[1]) : null;
  }
  return y;
}

function parsePageStudents(page, pageNo) {
  const items = page.items;
  const cols = getColumns(items, page.width);

  const bodyTop = getBodyTop(items);

  const anchors = items
    .filter(
      (it) =>
        it.y > bodyTop &&
        /^\d{8,16}$/.test(it.str) &&
        Math.abs(cx(it) - cols.number) <= 30
    )
    .sort((a, b) => a.y - b.y);

  if (!anchors.length) return [];

  const diffs = [];
  for (let i = 1; i < anchors.length; i++) diffs.push(anchors[i].y - anchors[i - 1].y);
  const avgPitch = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 31;

  const TOP = 0.27;
  const starts = anchors.map((a, i) => {
    const prevPitch = i > 0 ? a.y - anchors[i - 1].y : avgPitch;
    const start = a.y - TOP * prevPitch;
    return i === 0 ? Math.max(start, bodyTop) : start;
  });
  const ends = starts.map((_, i) =>
    i + 1 < starts.length ? starts[i + 1] : anchors[i].y + 0.75 * avgPitch
  );

  const rows = anchors.map(() => ({
    code: [], status: [], number: [], family: [], name: [], field: [], units: [], index: [],
  }));

  for (const it of items) {
    const bi = starts.findIndex((s, i) => it.y >= s && it.y < ends[i]);
    if (bi < 0) continue;
    const col = classify(it, cols);
    if (col) rows[bi][col].push(it);
  }

  return anchors.map((anchor, i) => {
    const r = rows[i];
    const num = anchor.str;

    const first = fixName(joinCell(r.name));
    const last = fixName(joinCell(r.family));
    const { field, degree, system } = splitFieldInfo(joinCell(r.field));

    const statusText = joinCell(r.status);
    const status = /فرعی/.test(statusText) ? "فرعی" : /اصلی/.test(statusText) ? "اصلی" : "";

    const codeStr = r.code.map((it) => it.str).find((s) => /^\d{6,}$/.test(s)) || "";

    /* units: right→left = ت.و.ن (theoretical), ت.و.ع (practical) */
    const units = [...r.units].sort((a, b) => cx(b) - cx(a)).map((it) => Number(it.str));

    const idxItem = [...r.index].sort(
      (a, b) => Math.abs(a.y - anchor.y) - Math.abs(b.y - anchor.y)
    )[0];

    return {
      page: pageNo,
      row: idxItem ? Number(idxItem.str) : null,
      num,
      first,
      last,
      field,
      degree,
      system,
      status,
      theoretical_units: units.length > 0 ? units[0] : null,
      practical_units: units.length > 1 ? units[1] : null,
      student_course_code: codeStr,
      entry_year: entryYear(num),
    };
  });
}

export function parseStudents(pages) {
  const warnings = [];
  const all = [];
  pages.forEach((p, i) => all.push(...parsePageStudents(p, i + 1)));

  const seen = new Set();
  const students = [];
  for (const s of all) {
    if (seen.has(s.num)) {
      warnings.push(`شمارهٔ دانشجویی ${s.num} تکراری بود و یکی‌اش حذف شد.`);
      continue;
    }
    seen.add(s.num);
    students.push(s);
  }

  for (const s of students) {
    const tag = s.row ? `ردیف ${s.row}` : `شمارهٔ ${s.num}`;
    if (!s.first || !s.last) warnings.push(`${tag}: نام یا نام‌خانوادگی خالی است.`);
    if (!s.field) warnings.push(`${tag}: رشته خوانده نشد.`);
  }

  return { students, warnings };
}

/* ------------------------------------------------------------
   Public entry point
   ------------------------------------------------------------ */

export function parsePdf(extracted) {
  const pages = extracted.pages.map((p) => ({
    ...p,
    items: p.items
      .map((it) => ({ ...it, str: clean(it.str) }))
      .filter((it) => it.str),
  }));

  const header = parseHeader(pages[0] || { items: [], width: 612 });
  const { students, warnings } = parseStudents(pages);

  if (!header.course_name) warnings.unshift("نام درس خوانده نشد.");
  if (header.student_count != null && header.student_count !== students.length) {
    warnings.unshift(
      `تعداد دانشجو در سربرگ ${header.student_count} است ولی ${students.length} نفر استخراج شد.`
    );
  }
  const rows = students.map((s) => s.row);
  if (rows.length && rows.every((r) => r != null)) {
    const sequential = rows.every((r, i) => r === i + 1);
    if (!sequential) warnings.push("شمارهٔ ردیف‌ها پشت‌سرهم نیست؛ ممکن است ردیفی جا افتاده باشد.");
  }

  return { header, students, warnings };
}