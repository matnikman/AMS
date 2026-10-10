/* ============================================================
   AMS — Table sorting
   Manages sort state for a data table. Toggle asc/desc/none.
   ============================================================ */

export function createSortState() {
  return { key: null, dir: null };
}

export function toggleSort(state, key) {
  if (state.key !== key) {
    return { key, dir: "asc" };
  }
  if (state.dir === "asc") return { key, dir: "desc" };
  if (state.dir === "desc") return { key: null, dir: null };
  return { key, dir: "asc" };
}

export function applySort(items, state, getValue) {
  if (!state.key || !state.dir) return [...items];
  const sorted = [...items].sort((a, b) => {
    const va = getValue(a, state.key);
    const vb = getValue(b, state.key);
    return compareValues(va, vb);
  });
  if (state.dir === "desc") sorted.reverse();
  return sorted;
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;

  const sa = String(a);
  const sb = String(b);

  const na = Number(sa);
  const nb = Number(sb);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;

  return sa.localeCompare(sb, "fa");
}

export function sortIndicator(state, key) {
  if (state.key !== key) return "";
  return state.dir === "asc" ? " ▲" : " ▼";
}