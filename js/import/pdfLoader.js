/* ============================================================
   AMS — PDF loader
   Load a PDF file with PDF.js and return, in ONE pass:
     - layout items (text + x/y/width/height) per page
     - plain text per page
   Place at: js/import/pdfLoader.js
   ============================================================ */

/* Resolve lib paths relative to THIS file (not relative to the page),
   so the main module and the worker are always found together. */
const LIB_URL = new URL("../../lib/pdf.mjs", import.meta.url).href;
const WORKER_URL = new URL("../../lib/pdf.worker.mjs", import.meta.url).href;

/* PDF.js is loaded lazily so the rest of the app works without it. */
let pdfjsLib = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  try {
    const mod = await import(LIB_URL);
    mod.GlobalWorkerOptions.workerSrc = WORKER_URL;
    pdfjsLib = mod;
    return pdfjsLib;
  } catch (err) {
    console.error("Failed to load PDF.js:", err);
    const onFile =
      typeof location !== "undefined" && location.protocol === "file:";
    throw new Error(
      "بارگذاری PDF.js ناموفق بود. مطمئن شو lib/pdf.mjs و lib/pdf.worker.mjs وجود دارند." +
        (onFile ? " (برنامه از file:// باز شده؛ با یک سرور محلی اجرا کن.)" : "") +
        ` [${err?.message || err}]`
    );
  }
}

/**
 * Read a PDF once and return layout + text.
 *
 * Each layout item: { str, x, y, w, h, dir }
 *   x    = left edge of the item
 *   y    = baseline, measured from the TOP of the page
 *   w, h = item width / height
 *   dir  = "rtl" | "ltr" | "ttb"
 * Blank / whitespace-only items are dropped.
 *
 * @param {File} file
 * @param {(done:number,total:number)=>void} [onProgress]
 * @returns {Promise<{
 *   pages: Array<{items:Array<{str:string,x:number,y:number,w:number,h:number,dir:string}>,width:number,height:number}>,
 *   texts: string[],
 *   totalPages: number,
 *   raw: string
 * }>}
 */
export async function extractPdf(file, onProgress) {
  if (!file) throw new Error("فایلی انتخاب نشده.");

  const pdfjs = await getPdfJs();
  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  try {
    const pages = [];
    const texts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const items = [];
      for (const it of content.items) {
        /* skip TextMarkedContent entries and blank strings */
        if (typeof it.str !== "string" || !it.str.trim()) continue;
        const tx = it.transform || [1, 0, 0, 1, 0, 0];
        items.push({
          str: it.str,
          x: tx[4],
          y: viewport.height - tx[5] /* top-down baseline */,
          w: it.width || 0,
          h: it.height || 0,
          dir: it.dir || "",
        });
      }

      pages.push({ items, width: viewport.width, height: viewport.height });
      texts.push(items.map((it) => it.str).join(" "));
      if (typeof page.cleanup === "function") page.cleanup();
      if (onProgress) onProgress(i, pdf.numPages);
    }

    return {
      pages,
      texts,
      totalPages: pdf.numPages,
      raw: texts.join("\n\n"),
    };
  } finally {
    await releasePdf(loadingTask, pdf);
  }
}

/**
 * Free the document. API differs between PDF.js versions:
 *   older: loadingTask.destroy()   newer: pdf.destroy()
 * Cleanup must never throw, so every call is guarded.
 */
async function releasePdf(loadingTask, pdf) {
  try {
    if (loadingTask && typeof loadingTask.destroy === "function") {
      await loadingTask.destroy();
    } else if (pdf && typeof pdf.destroy === "function") {
      await pdf.destroy();
    }
  } catch (err) {
    console.warn("PDF cleanup failed (ignored):", err);
  }
}

/* ------------------------------------------------------------
   Backwards-compatible wrappers
   ------------------------------------------------------------ */

/** @returns {Promise<{ pages: string[], totalPages: number, raw: string }>} */
export async function extractPdfText(file) {
  const { texts, totalPages, raw } = await extractPdf(file);
  return { pages: texts, totalPages, raw };
}

/** @returns {Promise<{ pages: Array<{items:Array,width:number,height:number}>, totalPages: number }>} */
export async function extractPdfLayout(file) {
  const { pages, totalPages } = await extractPdf(file);
  return { pages, totalPages };
}
