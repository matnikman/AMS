/* ============================================================
   AMS — PDF debug helper
   Dumps the raw text items of a PDF with coordinates, grouped
   into visual rows (right → left), so column x-positions and
   row y-positions are easy to read.

   Console usage:
     await AMS.pdfDebug(file)              // grouped rows, one log per page
     await AMS.pdfDebugJson(file)          // downloads <name>.layout.json
   Place at: js/import/pdfDebug.js
   ============================================================ */

import { extractPdfLayout } from "./pdfLoader.js";

const f0 = (n) => Math.round(n);

/** Group items into rows (|dy| <= tol); rows top→bottom, items right→left. */
function groupRows(items, tol) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const rows = [];
  for (const it of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(it.y - last.y) <= tol) last.items.push(it);
    else rows.push({ y: it.y, items: [it] });
  }
  for (const r of rows) r.items.sort((a, b) => b.x + b.w / 2 - (a.x + a.w / 2));
  return rows;
}

/**
 * Log the items of a PDF page by page. One console.log per page
 * (a single block of text that is easy to copy).
 *
 * @param {File} file
 * @param {{rowTol?:number, log?:boolean}} [opts]
 * @returns {Promise<{pages:Array, text:string}>}
 */
export async function debugPdf(file, { rowTol = 2.5, log = true } = {}) {
  const { pages, totalPages } = await extractPdfLayout(file);
  const blocks = [];

  pages.forEach((page, pi) => {
    const rows = groupRows(page.items, rowTol);
    const lines = rows.map((r) => {
      const cells = r.items
        .map((it) => `[x=${f0(it.x)} c=${f0(it.x + it.w / 2)} w=${f0(it.w)}] "${it.str}"`)
        .join("  ");
      return `y=${r.y.toFixed(1).padStart(6)} | ${cells}`;
    });
    blocks.push(
      `--- Page ${pi + 1}/${totalPages} (${page.items.length} items, ` +
        `${f0(page.width)}x${f0(page.height)}) ---\n${lines.join("\n")}`
    );
  });

  const text = blocks.join("\n\n");
  if (log) console.log(text);
  return { pages, text };
}

/** Download the raw layout (all pages) as JSON — handy for bug reports. */
export async function downloadPdfLayoutJson(file) {
  const { pages } = await extractPdfLayout(file);
  const blob = new Blob([JSON.stringify(pages, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(file.name || "pdf").replace(/\.pdf$/i, "")}.layout.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return pages;
}

/* ------------------------------------------------------------
   Register on window.AMS so console commands work directly.
   Uses Object.assign so it merges with main.js's AMS object.
   ------------------------------------------------------------ */
if (typeof window !== "undefined") {
  window.AMS = window.AMS || {};
  window.AMS.pdfDebug = debugPdf;
  window.AMS.pdfDebugJson = downloadPdfLayoutJson;
}