/* ============================================================
   AMS — Search
   Filter a list of students by name, family, or number.
   ============================================================ */

export function normalize(str) {
  return String(str ?? "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/\u200c/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function matchesStudent(student, query) {
  const q = normalize(query);
  if (!q) return true;
  const haystack = [
    student.first,
    student.last,
    `${student.first} ${student.last}`,
    student.num,
    student.field,
    student.degree,
  ]
    .map(normalize)
    .join(" ");
  return haystack.includes(q);
}

export function filterStudents(students, query) {
  if (!query || !normalize(query)) return [...students];
  return students.filter((s) => matchesStudent(s, query));
}

export function buildSearchInput({ placeholder = "جست‌وجو...", onChange } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "search-box";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "search-box__input";
  input.placeholder = placeholder;
  input.setAttribute("aria-label", placeholder);

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "search-box__clear";
  clearBtn.textContent = "✕";
  clearBtn.title = "پاک کردن جست‌وجو";
  clearBtn.hidden = true;

  input.addEventListener("input", () => {
    clearBtn.hidden = !input.value;
    onChange?.(input.value);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.hidden = true;
    onChange?.("");
    input.focus();
  });

  wrapper.appendChild(input);
  wrapper.appendChild(clearBtn);
  return wrapper;
}