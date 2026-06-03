const STORAGE_KEY = "yc-dark-theme-enabled";
const STYLE_ID = "yc-dark-theme-styles";
const TOGGLE_ID = "yc-dark-theme-toggle";
const LABEL_TEXT_CLASS = "yc-dark-label-text";
const PAGER_CONTROL_CLASS = "yc-dark-pager-control";
const RUN_REPORT_CLASS = "yc-run-report-page";
const RUN_REPORT_PANEL_CLASS = "yc-run-report-panel";
const DASH_TEXT_CLASS = "yc-dark-dash-text";
const STANDINGS_POSITIVE_CLASS = "yc-standings-result-positive";
const STANDINGS_NEGATIVE_CLASS = "yc-standings-result-negative";
const STANDINGS_DASH_CLASS = "yc-standings-result-dash";
const STANDINGS_TABLE_CLASS = "yc-standings-table";
const STANDINGS_DUPLICATE_CLASS = "yc-standings-duplicate-column";
const TARGET_LABELS = new Set([
  "Последний правильный ответ",
  "Последнее отправленное решение",
]);

function readThemePreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

function saveThemePreference(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // The page still works if localStorage is unavailable.
  }
}

function getStyleContainer() {
  return document.head || document.documentElement;
}

function enableThemeStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("styles.css");
  getStyleContainer().appendChild(link);
}

function disableThemeStyles() {
  document.getElementById(STYLE_ID)?.remove();
}

function setThemeEnabled(enabled) {
  document.documentElement.dataset.ycDarkTheme = enabled ? "on" : "off";

  if (enabled) {
    enableThemeStyles();
  } else {
    disableThemeStyles();
  }

  updateToggleButton(enabled);
}

function updateToggleButton(enabled) {
  const button = document.getElementById(TOGGLE_ID);

  if (!button) {
    return;
  }

  button.textContent = enabled ? "☀" : "☾";
  button.title = enabled ? "Выключить темную тему" : "Включить темную тему";
  button.setAttribute("aria-label", button.title);
  button.setAttribute("aria-pressed", String(enabled));
}

function createToggleButton() {
  if (document.getElementById(TOGGLE_ID) || !document.body) {
    return;
  }

  const button = document.createElement("button");
  button.id = TOGGLE_ID;
  button.type = "button";

  Object.assign(button.style, {
    position: "fixed",
    right: "18px",
    bottom: "18px",
    zIndex: "2147483647",
    width: "42px",
    height: "42px",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "50%",
    background: "#2f2f2f",
    color: "#ececec",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: "40px",
    textAlign: "center",
  });

  button.addEventListener("click", () => {
    const enabled = document.documentElement.dataset.ycDarkTheme !== "on";
    saveThemePreference(enabled);
    setThemeEnabled(enabled);
  });

  document.body.appendChild(button);
  updateToggleButton(document.documentElement.dataset.ycDarkTheme === "on");
}

function initToggleButton() {
  if (document.body) {
    createToggleButton();
    return;
  }

  document.addEventListener("DOMContentLoaded", createToggleButton, { once: true });
}

function markFooterLabelsAndPager() {
  if (!document.body) {
    return;
  }

  for (const element of document.body.querySelectorAll("div, span, td, th, p")) {
    if (TARGET_LABELS.has(element.textContent.trim())) {
      element.classList.add(LABEL_TEXT_CLASS);
    }
  }

  for (const element of document.body.querySelectorAll("a, button, span, div")) {
    if (/^(?:<|>|‹|›|«|»|\d+)$/.test(element.textContent.trim())) {
      element.classList.add(PAGER_CONTROL_CLASS);
    }
  }
}

function isLightColor(color) {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

  if (!match) {
    return false;
  }

  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);

  return red + green + blue > 620;
}

function markRunReportElements() {
  if (!document.documentElement.classList.contains(RUN_REPORT_CLASS) || !document.body) {
    return;
  }

  for (const element of document.body.querySelectorAll(".table__row_show_true *")) {
    if (isLightColor(getComputedStyle(element).backgroundColor)) {
      element.classList.add(RUN_REPORT_PANEL_CLASS);
    }
  }

  for (const element of document.body.querySelectorAll("td, th, span, div")) {
    if (/^(?:-|–|—|−)$/.test(element.textContent.trim())) {
      element.classList.add(DASH_TEXT_CLASS);
    }
  }
}

function markStandingsResults() {
  if (!document.body) {
    return;
  }

  const tables = document.body.querySelectorAll("table:has(.standings-cell)");

  for (const table of tables) {
    table.classList.add(STANDINGS_TABLE_CLASS);

    for (const element of table.querySelectorAll(`.${STANDINGS_DUPLICATE_CLASS}`)) {
      element.classList.remove(STANDINGS_DUPLICATE_CLASS);
    }

    const headerRow = table.querySelector("thead tr") || table.querySelector("tr");
    const headerCells = headerRow ? Array.from(headerRow.children) : [];
    const tail = headerCells.slice(-4).map((cell) => cell.textContent.trim().toLowerCase());

    if (
      tail.length === 4 &&
      tail[0].includes("очки") &&
      tail[1].includes("штраф") &&
      tail[2].includes("очки") &&
      tail[3].includes("штраф")
    ) {
      for (const row of table.querySelectorAll("tr")) {
        const cells = Array.from(row.children);
        cells.at(-4)?.classList.add(STANDINGS_DUPLICATE_CLASS);
        cells.at(-3)?.classList.add(STANDINGS_DUPLICATE_CLASS);
      }
    }
  }

  for (const element of document.body.querySelectorAll(
    ".standings-cell, .standings-cell__plain, .standings-cell__result"
  )) {
    const text = element.textContent.trim();
    element.classList.remove(
      STANDINGS_POSITIVE_CLASS,
      STANDINGS_NEGATIVE_CLASS,
      STANDINGS_DASH_CLASS
    );

    if (/^(?:-|–|—|−)$/.test(text)) {
      element.classList.add(STANDINGS_DASH_CLASS);
    } else if (text.startsWith("+")) {
      element.classList.add(STANDINGS_POSITIVE_CLASS);
    } else if (text.startsWith("-") || text.startsWith("−")) {
      element.classList.add(STANDINGS_NEGATIVE_CLASS);
    }
  }
}

function initPageMarkers() {
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", initPageMarkers, { once: true });
    return;
  }

  markFooterLabelsAndPager();
  markRunReportElements();
  markStandingsResults();

  const observer = new MutationObserver(() => {
    markFooterLabelsAndPager();
    markRunReportElements();
    markStandingsResults();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function markPageType() {
  document.documentElement.classList.toggle(
    RUN_REPORT_CLASS,
    window.location.pathname.includes("/run-report/")
  );
}

setThemeEnabled(readThemePreference());
markPageType();
initToggleButton();
initPageMarkers();
