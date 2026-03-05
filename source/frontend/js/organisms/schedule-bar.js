/**
 * Composant barre de schedules saisonniers.
 * Affiche les onglets de schedules et gère la navigation entre profils.
 * Modale intégrée pour créer/éditer avec sélecteurs jour/mois.
 */

const ScheduleBar = (() => {
  let schedules = [];
  let activeScheduleId = "base";
  let selectedScheduleId = "base";
  let onScheduleSelect = null;
  let onSchedulesChanged = null;
  let currentEditorSchedule = null;
  let isDirty = false;
  let currentEditorForm = null;
  let editorListenersBound = false;

  const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function init(onSelect, onChanged) {
    onScheduleSelect = onSelect;
    onSchedulesChanged = onChanged;
  }

  async function load() {
    const data = await PrerollAPI.getSchedules();
    schedules = data.schedules;
    activeScheduleId = data.active_schedule_id;
    render();
    return activeScheduleId;
  }

  function render() {
    const container = document.getElementById("schedule-bar");
    if (!container) return;
    container.innerHTML = "";

    const sorted = [...schedules].sort((a, b) => {
      if (a.id === "base") return -1;
      if (b.id === "base") return 1;
      return b.priority - a.priority;
    });

    sorted.forEach((schedule) => {
      const tab = createTab(schedule);
      container.appendChild(tab);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "schedule-tab schedule-tab--add";
    addBtn.textContent = "+";
    addBtn.title = I18n.t("new_schedule");
    addBtn.addEventListener("click", () => openModal(null));
    container.appendChild(addBtn);

    const active = schedules.find((s) => s.id === selectedScheduleId) || schedules[0] || null;
    if (active) {
      currentEditorSchedule = currentEditorSchedule ? schedules.find((s) => s.id === currentEditorSchedule.id) || active : active;
    }
    renderEditor();
    if (typeof ScheduleCalendar !== "undefined") ScheduleCalendar.update(schedules);
  }

  function createTab(schedule) {
    const tab = document.createElement("div");
    tab.className = "schedule-tab";
    if (schedule.id === selectedScheduleId) {
      tab.classList.add("schedule-tab--selected");
    }
    if (schedule.is_active) {
      tab.classList.add("schedule-tab--active");
    }

    const dot = document.createElement("span");
    dot.className = "schedule-tab__dot";
    if (schedule.id === "base") {
      dot.classList.add(schedule.is_active ? "schedule-tab__dot--active" : "schedule-tab__dot--base");
    } else if (!schedule.enabled) {
      dot.classList.add("schedule-tab__dot--off");
    } else if (schedule.is_active) {
      dot.classList.add("schedule-tab__dot--active");
    } else if (schedule.in_range) {
      dot.classList.add("schedule-tab__dot--overridden");
    } else {
      dot.classList.add("schedule-tab__dot--enabled");
    }
    tab.appendChild(dot);

    const nameSpan = document.createElement("span");
    nameSpan.className = "schedule-tab__name";
    nameSpan.textContent = schedule.name;
    tab.appendChild(nameSpan);

    if (schedule.start && schedule.end) {
      const dateSpan = document.createElement("span");
      dateSpan.className = "schedule-tab__dates";
      dateSpan.textContent = formatDateRange(schedule.start, schedule.end);
      tab.appendChild(dateSpan);
    }

    tab.addEventListener("click", () => selectSchedule(schedule.id));

    return tab;
  }

  function setDirty(val) {
    isDirty = val;
    const formActions = document.querySelector(".season-editor__form-actions");
    if (formActions) formActions.style.display = val ? "flex" : "none";
  }

  function selectSchedule(id) {
    if (isDirty && !confirm(I18n.t("unsaved_warning"))) return;
    selectedScheduleId = id;
    currentEditorSchedule = schedules.find((s) => s.id === id) || null;
    render();
    if (onScheduleSelect) onScheduleSelect(id);
  }

  function formatDateRange(start, end) {
    const fmt = (s) => {
      const [m, d] = s.split("-");
      return d + "/" + m;
    };
    return fmt(start) + " - " + fmt(end);
  }

  function parseMmDd(str) {
    if (!str) return { month: 1, day: 1 };
    const [m, d] = str.split("-").map(Number);
    return { month: m || 1, day: d || 1 };
  }

  function toMmDd(month, day) {
    return String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  function buildDayOptions(maxDay, selected) {
    let html = "";
    for (let d = 1; d <= maxDay; d++) {
      html += '<option value="' + d + '"' + (d === selected ? " selected" : "") + ">" + d + "</option>";
    }
    return html;
  }

  function createDatePicker(labelText, month, day) {
    const wrapper = document.createElement("div");
    wrapper.className = "schedule-modal__date";

    const label = document.createElement("label");
    label.className = "schedule-modal__label";
    label.textContent = labelText;

    const row = document.createElement("div");
    row.className = "schedule-modal__date-row";

    const daySelect = document.createElement("select");
    daySelect.className = "schedule-modal__select";
    daySelect.innerHTML = buildDayOptions(DAYS_IN_MONTH[month - 1], day);

    const monthSelect = document.createElement("select");
    monthSelect.className = "schedule-modal__select schedule-modal__select--month";
    I18n.t("months").forEach((name, i) => {
      const opt = document.createElement("option");
      opt.value = i + 1;
      opt.textContent = name;
      if (i + 1 === month) opt.selected = true;
      monthSelect.appendChild(opt);
    });

    monthSelect.addEventListener("change", () => {
      const mi = parseInt(monthSelect.value, 10) - 1;
      const maxDay = DAYS_IN_MONTH[mi];
      const currentDay = Math.min(parseInt(daySelect.value, 10), maxDay);
      daySelect.innerHTML = buildDayOptions(maxDay, currentDay);
    });

    row.appendChild(daySelect);
    row.appendChild(monthSelect);
    wrapper.appendChild(label);
    wrapper.appendChild(row);

    return {
      el: wrapper,
      getMonth: () => parseInt(monthSelect.value, 10),
      getDay: () => parseInt(daySelect.value, 10),
    };
  }

  function openModal(schedule) {
    if (isDirty && !confirm(I18n.t("unsaved_warning"))) return;
    setDirty(false);
    const isEdit = !!schedule;
    const existing = document.querySelector(".schedule-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "schedule-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "schedule-modal";

    // Title
    const title = document.createElement("h3");
    title.className = "schedule-modal__title";
    title.textContent = isEdit ? I18n.t("edit_prefix") + schedule.name : I18n.t("new_schedule");
    modal.appendChild(title);

    // Name
    const nameGroup = document.createElement("div");
    nameGroup.className = "schedule-modal__group";
    const nameLabel = document.createElement("label");
    nameLabel.className = "schedule-modal__label";
    nameLabel.textContent = I18n.t("field_name");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "schedule-modal__input";
    nameInput.value = isEdit ? schedule.name : "";
    nameInput.placeholder = I18n.t("schedule_placeholder");
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    modal.appendChild(nameGroup);

    // Date pickers
    const startDate = isEdit ? parseMmDd(schedule.start) : { month: 12, day: 1 };
    const endDate = isEdit ? parseMmDd(schedule.end) : { month: 12, day: 31 };

    const startPicker = createDatePicker(I18n.t("field_start"), startDate.month, startDate.day);
    const endPicker = createDatePicker(I18n.t("field_end"), endDate.month, endDate.day);

    const datesRow = document.createElement("div");
    datesRow.className = "schedule-modal__dates-row";
    datesRow.appendChild(startPicker.el);
    datesRow.appendChild(endPicker.el);
    modal.appendChild(datesRow);

    // Priority
    const prioGroup = document.createElement("div");
    prioGroup.className = "schedule-modal__group";
    const prioLabel = document.createElement("label");
    prioLabel.className = "schedule-modal__label";
    prioLabel.textContent = "Priorit\u00e9";
    const prioInput = document.createElement("input");
    prioInput.type = "number";
    prioInput.className = "schedule-modal__input schedule-modal__input--sm";
    prioInput.value = isEdit ? schedule.priority : 10;
    prioInput.min = 1;
    prioInput.max = 100;
    prioGroup.appendChild(prioLabel);
    prioGroup.appendChild(prioInput);
    modal.appendChild(prioGroup);

    // Actions
    const actions = document.createElement("div");
    actions.className = "schedule-modal__actions";

    if (isEdit) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn--danger btn--sm";
      deleteBtn.textContent = I18n.t("btn_delete");
      deleteBtn.addEventListener("click", () => {
        PrerollAPI.deleteSchedule(schedule.id)
          .then(() => {
            overlay.remove();
            if (selectedScheduleId === schedule.id) {
              selectedScheduleId = "base";
              if (onScheduleSelect) onScheduleSelect("base");
            }
            load().then(() => {
              if (onSchedulesChanged) onSchedulesChanged();
            });
          })
          .catch((err) => alert(I18n.t("error_prefix") + err.message));
      });
      actions.appendChild(deleteBtn);
    }

    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    actions.appendChild(spacer);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn--ghost btn--sm";
    cancelBtn.textContent = I18n.t("btn_cancel");
    cancelBtn.addEventListener("click", () => overlay.remove());
    actions.appendChild(cancelBtn);

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn--primary btn--sm";
    saveBtn.textContent = isEdit ? I18n.t("btn_save") : I18n.t("btn_create");
    saveBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }

      const start = toMmDd(startPicker.getMonth(), startPicker.getDay());
      const end = toMmDd(endPicker.getMonth(), endPicker.getDay());
      const priority = parseInt(prioInput.value, 10) || 10;

      const promise = isEdit ? PrerollAPI.updateSchedule(schedule.id, { name, start, end, priority }) : PrerollAPI.createSchedule(name, start, end, priority);

      promise
        .then(() => {
          overlay.remove();
          load().then(() => {
            if (onSchedulesChanged) onSchedulesChanged();
          });
        })
        .catch((err) => alert(I18n.t("error_prefix") + err.message));
    });
    actions.appendChild(saveBtn);

    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    nameInput.focus();
  }

  function getSelectedScheduleId() {
    return selectedScheduleId;
  }

  function setSelected(id) {
    selectedScheduleId = id;
  }

  function renderEditor() {
    const container = document.getElementById("season-editor-content");
    if (!container) return;

    container.innerHTML = "";
    const schedule = currentEditorSchedule;

    if (!schedule) {
      const empty = document.createElement("div");
      empty.className = "season-editor__empty";
      empty.textContent = I18n.t("select_schedule");
      container.appendChild(empty);
      return;
    }

    const isBase = schedule.id === "base";
    const form = document.createElement("div");
    form.className = "season-editor__form";

    const headerBtns = document.getElementById("editor-header-btns");
    if (headerBtns) headerBtns.innerHTML = "";

    if (!isBase) {
      const initEnabled = schedule.enabled !== false;
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn btn--sm season-editor__toggle " + (initEnabled ? "btn--primary" : "btn--ghost");
      toggleBtn.textContent = initEnabled ? I18n.t("toggle_on") : I18n.t("toggle_off");
      toggleBtn.dataset.enabled = String(initEnabled);
      toggleBtn.addEventListener("click", () => {
        const current = toggleBtn.dataset.enabled === "true";
        const next = !current;
        toggleBtn.dataset.enabled = String(next);
        toggleBtn.textContent = next ? I18n.t("toggle_on") : I18n.t("toggle_off");
        toggleBtn.className = "btn btn--sm season-editor__toggle " + (next ? "btn--primary" : "btn--ghost");
        toggleBtn.disabled = true;
        PrerollAPI.updateSchedule(schedule.id, { enabled: next })
          .then(async (updated) => {
            if (updated.in_range || updated.is_active) await PrerollAPI.evaluateSchedules();
            await load();
            if (onSchedulesChanged) onSchedulesChanged();
          })
          .catch((err) => {
            alert(I18n.t("error_prefix") + err.message);
            toggleBtn.dataset.enabled = String(current);
            toggleBtn.textContent = current ? I18n.t("toggle_on") : I18n.t("toggle_off");
            toggleBtn.className = "btn btn--sm season-editor__toggle " + (current ? "btn--primary" : "btn--ghost");
          })
          .finally(() => {
            toggleBtn.disabled = false;
          });
      });
      if (headerBtns) headerBtns.appendChild(toggleBtn);
    }

    const fields = document.createElement("div");
    fields.className = "season-editor__fields";

    const nameGroup = document.createElement("div");
    nameGroup.className = "season-editor__group";
    const nameLabel = document.createElement("label");
    nameLabel.className = "schedule-modal__label";
    nameLabel.textContent = I18n.t("field_name");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "schedule-modal__input";
    nameInput.value = schedule.name;
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    fields.appendChild(nameGroup);

    const prioGroup = document.createElement("div");
    prioGroup.className = "season-editor__group";
    const prioLabel = document.createElement("label");
    prioLabel.className = "schedule-modal__label";
    prioLabel.textContent = I18n.t("field_priority");
    const prioInput = document.createElement("input");
    prioInput.type = "number";
    prioInput.className = "schedule-modal__input";
    prioInput.value = schedule.priority || 0;
    prioInput.min = 0;
    prioInput.max = 100;
    prioGroup.appendChild(prioLabel);
    prioGroup.appendChild(prioInput);
    if (!isBase) fields.appendChild(prioGroup);

    form.appendChild(fields);

    const skipGroup = document.createElement("div");
    skipGroup.className = "season-editor__skip-inline";
    const skipLabel = document.createElement("span");
    skipLabel.className = "schedule-modal__label";
    skipLabel.setAttribute("data-i18n", "skip");
    skipLabel.textContent = I18n.t("skip");
    const skipHint = document.createElement("span");
    skipHint.className = "season-editor__skip-hint";
    skipHint.textContent = "\u24D8";
    skipHint.title = I18n.t("skip_hint");
    const sliderEl = document.createElement("input");
    sliderEl.type = "range";
    sliderEl.className = "slider-input slider-input--xs";
    sliderEl.id = "prob-slider";
    sliderEl.min = 0;
    sliderEl.max = 100;
    sliderEl.value = 0;
    sliderEl.step = 1;
    const sliderVal = document.createElement("span");
    sliderVal.id = "prob-value";
    sliderVal.className = "header__slider-value";
    sliderVal.textContent = "0%";
    sliderEl.addEventListener("input", (e) => {
      e.stopPropagation();
    });
    skipGroup.appendChild(skipLabel);
    skipGroup.appendChild(skipHint);
    skipGroup.appendChild(sliderEl);
    skipGroup.appendChild(sliderVal);
    form.appendChild(skipGroup);

    if (!isBase) {
      const startDate = parseMmDd(schedule.start);
      const endDate = parseMmDd(schedule.end);
      const startPicker = createDatePicker(I18n.t("field_start"), startDate.month, startDate.day);
      const endPicker = createDatePicker(I18n.t("field_end"), endDate.month, endDate.day);
      form._startPicker = startPicker;
      form._endPicker = endPicker;

      const datesRow = document.createElement("div");
      datesRow.className = "season-editor__dates-row";
      datesRow.appendChild(startPicker.el);
      datesRow.appendChild(endPicker.el);
      form.appendChild(datesRow);
    }

    const actionsRow = document.createElement("div");
    actionsRow.className = "season-editor__actions";

    if (!isBase) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn--danger btn--sm";
      deleteBtn.textContent = I18n.t("btn_delete");
      deleteBtn.addEventListener("click", () => {
        PrerollAPI.deleteSchedule(schedule.id)
          .then(() => {
            setDirty(false);
            currentEditorSchedule = null;
            if (headerBtns) headerBtns.innerHTML = "";
            renderEditor();
            if (selectedScheduleId === schedule.id) {
              selectedScheduleId = "base";
              if (onScheduleSelect) onScheduleSelect("base");
            }
            load().then(() => {
              if (onSchedulesChanged) onSchedulesChanged();
            });
          })
          .catch((err) => alert(I18n.t("error_prefix") + err.message));
      });
      actionsRow.appendChild(deleteBtn);
    }

    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    actionsRow.appendChild(spacer);

    const formSaveActions = document.createElement("div");
    formSaveActions.className = "season-editor__form-actions";
    formSaveActions.style.display = isDirty ? "flex" : "none";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn--ghost btn--sm";
    cancelBtn.setAttribute("data-i18n", "btn_cancel");
    cancelBtn.textContent = I18n.t("btn_cancel");
    cancelBtn.addEventListener("click", () => ScheduleBar.cancelEditor());
    formSaveActions.appendChild(cancelBtn);

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn--primary btn--sm";
    saveBtn.setAttribute("data-i18n", "btn_save");
    saveBtn.textContent = I18n.t("btn_save");
    saveBtn.addEventListener("click", () => ScheduleBar.saveEditor());
    formSaveActions.appendChild(saveBtn);

    actionsRow.appendChild(formSaveActions);
    form.appendChild(actionsRow);

    currentEditorForm = form;
    if (!editorListenersBound) {
      container.addEventListener("input", () => setDirty(true));
      container.addEventListener("change", () => setDirty(true));
      editorListenersBound = true;
    }
    container.appendChild(form);
  }

  async function saveEditor() {
    if (!currentEditorSchedule || !currentEditorForm) return;
    const schedule = currentEditorSchedule;
    const isBase = schedule.id === "base";

    const nameInput = currentEditorForm.querySelector("input[type='text']");
    const prioInput = currentEditorForm.querySelector("input[type='number']");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
      if (nameInput) nameInput.focus();
      return;
    }

    const updateData = { name };
    if (!isBase) {
      if (prioInput) updateData.priority = parseInt(prioInput.value, 10) || 0;
      if (currentEditorForm._startPicker && currentEditorForm._endPicker) {
        updateData.start = toMmDd(currentEditorForm._startPicker.getMonth(), currentEditorForm._startPicker.getDay());
        updateData.end = toMmDd(currentEditorForm._endPicker.getMonth(), currentEditorForm._endPicker.getDay());
      }
      const toggleEl = currentEditorForm.querySelector(".season-editor__toggle");
      if (toggleEl) updateData.enabled = toggleEl.dataset.enabled === "true";
    }

    try {
      const updated = await PrerollAPI.updateSchedule(schedule.id, updateData);
      setDirty(false);
      if (updated.in_range || updated.is_active) {
        await PrerollAPI.evaluateSchedules();
      }
      await load();
      if (onSchedulesChanged) onSchedulesChanged();
    } catch (err) {
      alert(I18n.t("error_prefix") + err.message);
    }
  }

  function cancelEditor() {
    setDirty(false);
    renderEditor();
  }

  return { init, load, render, getSelectedScheduleId, setSelected, renderEditor, saveEditor, cancelEditor };
})();
