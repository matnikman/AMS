/* ============================================================
   AMS — Toast notifications
   Small popup at the bottom. Used mainly on save.
   Auto-dismisses. Supports success / error / info.
   ============================================================ */

const CONTAINER_ID = "ams-toast-container";
const DEFAULT_DURATION = 2200;

let container = null;

/**
 * Ensure the toast container exists in the DOM.
 */
function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

/**
 * Show a toast.
 * @param {string} message
 * @param {"success"|"error"|"info"} [type]
 * @param {number} [duration] ms
 */
export function showToast(message, type = "info", duration = DEFAULT_DURATION) {
  const c = ensureContainer();

  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", "status");
  el.textContent = message;

  c.appendChild(el);

  /* Trigger enter animation on next frame */
  requestAnimationFrame(() => el.classList.add("toast--visible"));

  const remove = () => {
    el.classList.remove("toast--visible");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
    /* Fallback in case transitionend never fires */
    setTimeout(() => el.remove(), 400);
  };

  setTimeout(remove, duration);
}

export function toastSuccess(message, duration) {
  showToast(message, "success", duration);
}

export function toastError(message, duration) {
  showToast(message, "error", duration);
}

export function toastInfo(message, duration) {
  showToast(message, "info", duration);
}