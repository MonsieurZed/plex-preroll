/**
 * Module calendrier annuel des schedules.
 * Affiche une vue 12 mois indiquant quel schedule est actif chaque jour.
 * Gère les périodes chevauchant le changement d'année (ex: Déc → Jan).
 * Dépendances : I18n
 */

const ScheduleCalendar = (() => {
  let _schedules = [];
  let _overlay = null;

  const PALETTE = ["#6b7280", "#3b82f6", "#f97316", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#ef4444", "#22c55e"];

  const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function daysInMonth(month, year) {
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    return DAYS_IN_MONTH[month - 1];
  }

  /**
   * Détermine si une date (mois/jour) est couverte par un schedule.
   * Gère les périodes chevauchant le 31 déc → 1 jan.
   * @param {Object} schedule
   * @param {number} month
   * @param {number} day
   * @returns {boolean}
   */
  function isInRange(schedule, month, day) {
    if (!schedule.start || !schedule.end) return true;
    if (!schedule.enabled) return false;
    const d = month * 100 + day;
    const s = parseInt(schedule.start.replace("-", ""), 10);
    const e = parseInt(schedule.end.replace("-", ""), 10);
    return s <= e ? d >= s && d <= e : d >= s || d <= e;
  }

  /**
   * Assigne une couleur à chaque schedule.
   * @param {Array} schedules
   * @returns {Object} map id → { color, label }
   */
  function assignColors(schedules) {
    const map = {};
    let ci = 0;
    schedules.forEach((s) => {
      map[s.id] = {
        color: PALETTE[ci % PALETTE.length],
        label: s.name,
        enabled: s.enabled,
      };
      ci++;
    });
    return map;
  }

  /**
   * Retourne le schedule actif pour un jour donné (priorité la plus haute).
   * @param {Array} schedules
   * @param {number} month
   * @param {number} day
   * @returns {Object|null}
   */
  function getScheduleForDay(schedules, month, day) {
    const sorted = [...schedules].filter((s) => s.id !== "base" && s.enabled).sort((a, b) => b.priority - a.priority);

    for (const s of sorted) {
      if (isInRange(s, month, day)) return s;
    }

    return schedules.find((s) => s.id === "base") || null;
  }

  /**
   * Construit le bloc HTML d'un mois.
   * @param {Array} schedules
   * @param {Object} colorMap
   * @param {number} month
   * @param {number} year
   * @param {Object} today { year, month, day }
   * @returns {HTMLElement}
   */
  function renderMonth(schedules, colorMap, month, year, today) {
    const dim = daysInMonth(month, year);
    const monthNames = I18n.t("months");
    const monthName = monthNames[month - 1];

    const section = document.createElement("div");
    section.className = "cal-month";

    const title = document.createElement("div");
    title.className = "cal-month__name";
    title.textContent = monthName;
    section.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "cal-month__grid";

    for (let d = 1; d <= dim; d++) {
      const sched = getScheduleForDay(schedules, month, d);
      const info = sched && colorMap[sched.id] ? colorMap[sched.id] : null;
      const isToday = today.year === year && today.month === month && today.day === d;

      const cell = document.createElement("div");
      cell.className = "cal-day";
      if (isToday) cell.classList.add("cal-day--today");

      if (info) {
        const isBase = sched.id === "base";
        cell.style.background = info.color + (isBase ? "28" : "7a");
        if (!isBase) cell.style.borderColor = info.color + "99";
        const prefix = isToday ? "\u2605 " : "";
        cell.title = prefix + info.label + " — " + d + " " + monthName;
      }

      const num = document.createElement("span");
      num.textContent = d;
      cell.appendChild(num);
      grid.appendChild(cell);
    }

    section.appendChild(grid);
    return section;
  }

  /**
   * Construit le modal complet du calendrier.
   * @returns {HTMLElement}
   */
  function build() {
    const now = new Date();
    const year = now.getFullYear();
    const today = { year, month: now.getMonth() + 1, day: now.getDate() };

    const colorMap = assignColors(_schedules);

    const overlay = document.createElement("div");
    overlay.className = "cal-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    const modal = document.createElement("div");
    modal.className = "cal-modal";

    const header = document.createElement("div");
    header.className = "cal-modal__header";

    const titleEl = document.createElement("h2");
    titleEl.className = "cal-modal__title";
    titleEl.textContent = I18n.t("calendar_title") + " " + year;

    const closeBtn = document.createElement("button");
    closeBtn.className = "btn btn--ghost btn--sm cal-modal__close";
    closeBtn.textContent = "\u00D7";
    closeBtn.addEventListener("click", close);

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "cal-grid";

    for (let m = 1; m <= 12; m++) {
      grid.appendChild(renderMonth(_schedules, colorMap, m, year, today));
    }
    modal.appendChild(grid);

    const legend = document.createElement("div");
    legend.className = "cal-legend";

    _schedules.forEach((s) => {
      const info = colorMap[s.id];
      if (!info) return;

      const item = document.createElement("div");
      item.className = "cal-legend__item" + (s.enabled ? "" : " cal-legend__item--off");

      const dot = document.createElement("span");
      dot.className = "cal-legend__dot";
      dot.style.background = info.color;

      const label = document.createElement("span");
      label.textContent = info.label;
      if (!s.enabled) label.textContent += " (" + I18n.t("toggle_off") + ")";

      item.appendChild(dot);
      item.appendChild(label);
      legend.appendChild(item);
    });

    modal.appendChild(legend);
    overlay.appendChild(modal);
    return overlay;
  }

  /**
   * Ouvre le modal calendrier.
   */
  function open() {
    if (_overlay) return;
    _overlay = build();
    document.body.appendChild(_overlay);
    requestAnimationFrame(() => _overlay.classList.add("cal-overlay--visible"));
  }

  /**
   * Ferme le modal calendrier.
   */
  function close() {
    if (!_overlay) return;
    const el = _overlay;
    _overlay = null;
    el.classList.remove("cal-overlay--visible");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  }

  /**
   * Met à jour les schedules. Reconstruit le modal s'il est ouvert.
   * @param {Array} schedules
   */
  function update(schedules) {
    _schedules = schedules || [];
    if (_overlay) {
      close();
      setTimeout(open, 220);
    }
  }

  return { open, close, update };
})();
