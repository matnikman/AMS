/* ============================================================
   AMS — Simple modal
   Promise-based confirm dialog.
   ============================================================ */

/**
 * Show a confirmation modal.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.confirmText]
 * @param {string} [opts.cancelText]
 * @returns {Promise<boolean>}
 */
export function confirmModal({
  title,
  message,
  confirmText = "تأیید",
  cancelText = "انصراف",
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal__title"></h3>
        <p class="modal__message"></p>
        <div class="modal__actions">
          <button class="btn modal__cancel"></button>
          <button class="btn btn--danger modal__confirm"></button>
        </div>
      </div>
    `;

    overlay.querySelector(".modal__title").textContent = title || "";
    overlay.querySelector(".modal__message").textContent = message || "";
    overlay.querySelector(".modal__cancel").textContent = cancelText;
    overlay.querySelector(".modal__confirm").textContent = confirmText;

    const close = (result) => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };

    const onKey = (e) => { if (e.key === "Escape") close(false); };

    overlay.querySelector(".modal__cancel").addEventListener("click", () => close(false));
    overlay.querySelector(".modal__confirm").addEventListener("click", () => close(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener("keydown", onKey);

    document.body.appendChild(overlay);
    overlay.querySelector(".modal__confirm").focus();
  });
}