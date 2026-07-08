/**
 * Track finished explainer threads in localStorage (per browser).
 * Loaded by the workbook and PR explainer pages.
 */
(function () {
  const STORAGE_KEY = "understanding:finished";

  function getFinished() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function isFinished(threadId) {
    return Boolean(getFinished()[threadId]);
  }

  function setFinished(threadId, finished) {
    const data = getFinished();
    if (finished) data[threadId] = new Date().toISOString();
    else delete data[threadId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent("understanding-read-change", {
        detail: { threadId, finished },
      }),
    );
  }

  function label(finished) {
    return finished ? "Finished reading" : "Mark as finished";
  }

  function injectStyles() {
    if (document.getElementById("understanding-reader-styles")) return;
    const style = document.createElement("style");
    style.id = "understanding-reader-styles";
    style.textContent = `
      .thread.is-finished .card { border-color: #86efac; background: #f0fdf4; }
      .thread.is-finished .read-badge { display: inline-flex; }
      .read-badge { display: none; align-items: center; flex-shrink: 0; font-size: .6875rem; font-weight: 600;
        color: #15803d; background: #dcfce7; padding: .2rem .45rem; border-radius: 6px; }
      .thread .mark-read { display: block; width: 100%; margin: 0; font: inherit; font-size: .8125rem; font-weight: 600;
        color: var(--accent, #2563eb); background: transparent; border: none; border-top: 1px solid var(--border, #e5e2dc);
        border-radius: 0; padding: .65rem 1.125rem; min-height: 40px; cursor: pointer; text-align: left; }
      .thread .mark-read:hover { background: #eff6ff; }
      .thread.is-finished .mark-read { color: #15803d; border-top-color: #86efac; }
      .thread.is-finished .mark-read:hover { background: #ecfdf5; }
      .understanding-toolbar { display: flex; align-items: center; justify-content: space-between; gap: .75rem;
        flex-wrap: wrap; max-width: 56rem; margin: 0 auto 1rem; padding: .75rem 1.25rem;
        background: #fff; border: 1px solid #e5e2dc; border-radius: 10px; font-family: system-ui, sans-serif; font-size: .875rem; }
      .understanding-toolbar a { color: #2563eb; text-decoration: none; font-weight: 600; }
      .understanding-toolbar .mark-read { width: auto; margin: 0; }
    `;
    document.head.appendChild(style);
  }

  function syncThreadEl(el) {
    const threadId = el.dataset.threadId;
    if (!threadId) return;
    const finished = isFinished(threadId);
    el.classList.toggle("is-finished", finished);
    const btn = el.querySelector(".mark-read");
    if (btn) {
      btn.textContent = label(finished);
      btn.setAttribute("aria-pressed", finished ? "true" : "false");
    }
  }

  function wireMarkButton(btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const host =
        btn.closest("[data-thread-id]") ||
        document.querySelector("[data-thread-id]");
      if (!host) return;
      const threadId = host.dataset.threadId;
      setFinished(threadId, !isFinished(threadId));
      syncThreadEl(host);
      document.querySelectorAll(`[data-thread-id="${threadId}"]`).forEach(syncThreadEl);
    });
  }

  function initWorkbook() {
    injectStyles();
    document.querySelectorAll(".thread[data-thread-id]").forEach(function (el) {
      syncThreadEl(el);
      const btn = el.querySelector(".mark-read");
      if (btn) wireMarkButton(btn);
    });
    window.addEventListener("understanding-read-change", function () {
      document.querySelectorAll(".thread[data-thread-id]").forEach(syncThreadEl);
    });
  }

  function initExplainer(threadId) {
    injectStyles();
    const bar = document.createElement("div");
    bar.className = "understanding-toolbar";
    bar.dataset.threadId = threadId;
    bar.innerHTML =
      '<a href="/">← Workbook</a><button type="button" class="mark-read"></button>';
    document.body.insertBefore(bar, document.body.firstChild);
    syncThreadEl(bar);
    wireMarkButton(bar.querySelector(".mark-read"));
    window.addEventListener("understanding-read-change", function (ev) {
      if (ev.detail.threadId === threadId) syncThreadEl(bar);
    });
  }

  const script = document.currentScript;
  const mode = script?.dataset?.mode || document.body.dataset.understandingPage;
  if (mode === "workbook") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initWorkbook);
    } else {
      initWorkbook();
    }
  } else if (mode === "explainer" && script?.dataset?.threadId) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        initExplainer(script.dataset.threadId);
      });
    } else {
      initExplainer(script.dataset.threadId);
    }
  }
})();
