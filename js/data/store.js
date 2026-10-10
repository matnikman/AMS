/* ============================================================
   AMS — Data store
   Manages students, courses, and enrollments.
   All data in localStorage, one key per entity.
   ============================================================ */

import * as storage from "../core/storage.js";

const STUDENTS_KEY = "students";
const COURSES_KEY = "courses";
const ENROLLMENTS_KEY = "enrollments";

/* ============================================================
   Students
   ============================================================ */

export function loadStudents() {
  return storage.load(STUDENTS_KEY, []);
}

export function saveStudents(list) {
  return storage.save(STUDENTS_KEY, Array.isArray(list) ? list : []);
}

export function findStudent(num) {
  return loadStudents().find((s) => s.num === String(num)) || null;
}

export function findStudentById(id) {
  return loadStudents().find((s) => s.id === id) || null;
}

/**
 * Add a student if not present (by num). If present, update fields.
 * Preserves all academic fields: units, course code, entry year.
 */
export function upsertStudent(partial) {
  const list = loadStudents();
  const num = String(partial.num || "");
  if (!num) return null;

  const idx = list.findIndex((s) => s.num === num);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...partial };
    saveStudents(list);
    return list[idx];
  }

  const student = {
    id: partial.id || `u${Date.now()}${Math.floor(Math.random() * 1000)}`,
    num,
    first: partial.first || "",
    last: partial.last || "",
    field: partial.field || "",
    degree: partial.degree || "",
    system: partial.system || "",
    student_course_code: partial.student_course_code || "",
    theoretical_units:
      typeof partial.theoretical_units === "number"
        ? partial.theoretical_units
        : null,
    practical_units:
      typeof partial.practical_units === "number"
        ? partial.practical_units
        : null,
    entry_year: partial.entry_year || "",
    created_at: new Date().toISOString(),
  };
  list.push(student);
  saveStudents(list);
  return student;
}

export function updateStudent(id, patch) {
  const list = loadStudents();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  saveStudents(list);
  return list[idx];
}

export function removeStudent(id) {
  const students = loadStudents().filter((s) => s.id !== id);
  saveStudents(students);
  const enrollments = loadEnrollments().filter((e) => e.student_id !== id);
  saveEnrollments(enrollments);
  return students;
}

/* ============================================================
   Courses
   ============================================================ */

export function loadCourses() {
  return storage.load(COURSES_KEY, []);
}

export function saveCourses(list) {
  return storage.save(COURSES_KEY, Array.isArray(list) ? list : []);
}

export function findCourse(id) {
  return loadCourses().find((c) => c.id === id) || null;
}

export function addCourse(course) {
  const list = loadCourses();
  list.push(course);
  saveCourses(list);
  return course;
}

export function updateCourse(id, patch) {
  const list = loadCourses();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  saveCourses(list);
  return list[idx];
}

export function removeCourse(id) {
  const courses = loadCourses().filter((c) => c.id !== id);
  saveCourses(courses);
  const enrollments = loadEnrollments().filter((e) => e.course_id !== id);
  saveEnrollments(enrollments);
  return courses;
}

/* ============================================================
   Enrollments
   ============================================================ */

export function loadEnrollments() {
  return storage.load(ENROLLMENTS_KEY, []);
}

export function saveEnrollments(list) {
  return storage.save(ENROLLMENTS_KEY, Array.isArray(list) ? list : []);
}

export function enroll(studentId, courseId, status = "اصلی") {
  const list = loadEnrollments();
  const exists = list.some(
    (e) => e.student_id === studentId && e.course_id === courseId
  );
  if (exists) return null;

  const enr = {
    id: `e${Date.now()}${Math.floor(Math.random() * 1000)}`,
    student_id: studentId,
    course_id: courseId,
    status,
    created_at: new Date().toISOString(),
  };
  list.push(enr);
  saveEnrollments(list);
  return enr;
}

export function unenroll(studentId, courseId) {
  const list = loadEnrollments().filter(
    (e) => !(e.student_id === studentId && e.course_id === courseId)
  );
  saveEnrollments(list);
  return list;
}

/**
 * Return all students enrolled in a course.
 * Merges student data with the enrollment record.
 */
export function studentsInCourse(courseId) {
  const enr = loadEnrollments().filter((e) => e.course_id === courseId);
  const students = loadStudents();
  const byId = new Map(students.map((s) => [s.id, s]));

  return enr
    .map((e) => {
      const student = byId.get(e.student_id);
      if (!student) return null;
      return { ...student, enrollment_id: e.id, status: e.status };
    })
    .filter(Boolean);
}

export function coursesForStudent(studentId) {
  const enr = loadEnrollments().filter((e) => e.student_id === studentId);
  const courses = loadCourses();
  const byId = new Map(courses.map((c) => [c.id, c]));

  return enr
    .map((e) => {
      const course = byId.get(e.course_id);
      if (!course) return null;
      return { ...course, enrollment_id: e.id, status: e.status };
    })
    .filter(Boolean);
}

export function isEnrolled(studentId, courseId) {
  return loadEnrollments().some(
    (e) => e.student_id === studentId && e.course_id === courseId
  );
}

/* ============================================================
   Utilities
   ============================================================ */

export function clearAllData() {
  storage.remove(STUDENTS_KEY);
  storage.remove(COURSES_KEY);
  storage.remove(ENROLLMENTS_KEY);
}

export function exportAll() {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    students: loadStudents(),
    courses: loadCourses(),
    enrollments: loadEnrollments(),
    settings: storage.load("settings", null),
  };
}

export function importAll(data, mode = "replace") {
  if (!data || typeof data !== "object") {
    throw new Error("فایل پشتیبان نامعتبر است.");
  }

  const { students = [], courses = [], enrollments = [], settings } = data;

  if (mode === "replace") {
    saveStudents(students);
    saveCourses(courses);
    saveEnrollments(enrollments);
    if (settings) storage.save("settings", settings);
    return { students: students.length, courses: courses.length };
  }

  /* Merge mode */
  const existingStudents = loadStudents();
  const existingNums = new Set(existingStudents.map((s) => s.num));
  const idMap = new Map();

  let addedStudents = 0;
  for (const s of students) {
    if (existingNums.has(s.num)) {
      const found = existingStudents.find((x) => x.num === s.num);
      idMap.set(s.id, found.id);
    } else {
      const newStudent = {
        ...s,
        id: `u${Date.now()}${Math.floor(Math.random() * 1000)}`,
      };
      existingStudents.push(newStudent);
      existingNums.add(s.num);
      idMap.set(s.id, newStudent.id);
      addedStudents++;
    }
  }
  saveStudents(existingStudents);

  const existingCourses = loadCourses();
  const existingKeys = new Set(
    existingCourses.map((c) => `${c.course_code}|${c.class_code}`)
  );

  let addedCourses = 0;
  for (const c of courses) {
    const key = `${c.course_code}|${c.class_code}`;
    if (existingKeys.has(key)) continue;
    const newCourse = {
      ...c,
      id: `c${Date.now()}${Math.floor(Math.random() * 1000)}`,
    };
    existingCourses.push(newCourse);
    existingKeys.add(key);
    addedCourses++;
  }
  saveCourses(existingCourses);

  const existingEnr = loadEnrollments();
  const existingPairs = new Set(
    existingEnr.map((e) => `${e.student_id}|${e.course_id}`)
  );

  for (const e of enrollments) {
    const newStudentId = idMap.get(e.student_id) || e.student_id;
    const key = `${newStudentId}|${e.course_id}`;
    if (existingPairs.has(key)) continue;
    existingEnr.push({
      ...e,
      id: `e${Date.now()}${Math.floor(Math.random() * 1000)}`,
      student_id: newStudentId,
    });
    existingPairs.add(key);
  }
  saveEnrollments(existingEnr);

  return { students: addedStudents, courses: addedCourses };
}

export function getStats() {
  return {
    students: loadStudents().length,
    courses: loadCourses().length,
    enrollments: loadEnrollments().length,
  };
}