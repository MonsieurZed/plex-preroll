/**
 * Orchestrateur principal de l'application Plex Preroll Manager.
 * Gère les schedules saisonniers, les poids vidéo et la prévisualisation.
 */

const App = (() => {
  let currentVideos = [];
  let currentProbability = 0;
  let currentPreviewVideo = null;
  let currentScheduleId = "base";
  let currentStatusState = "loading";
  let currentStatusKey = "loading";
  let currentStatusDynamic = null;

  const els = {};

  function cacheElements() {
    els.dot = document.getElementById("status-dot");
    els.label = document.getElementById("status-label");
    els.statVideos = document.getElementById("stat-videos");
    els.statChance = document.getElementById("stat-chance");
    els.saveBtn = document.getElementById("save-btn");
    els.rescanBtn = document.getElementById("rescan-btn");
    els.previewEmpty = document.getElementById("preview-empty");
    els.previewPlayer = document.getElementById("preview-player");
    els.previewVideo = document.getElementById("preview-video");
    els.previewError = document.getElementById("preview-error");
    els.previewFilename = document.getElementById("preview-filename");
    els.previewPath = document.getElementById("preview-path");
    els.autoPlayBtn = document.getElementById("autoplay-btn");
    els.plexCurrentBtn = document.getElementById("plex-current-btn");
    els.calendarBtn = document.getElementById("calendar-btn");
  }

  async function init() {
    cacheElements();
    bindEvents();
    updateAutoPlayBtn();
    setStatus("loading", "loading");

    ScheduleBar.init(onScheduleSelect, onSchedulesChanged);

    try {
      const activeId = await ScheduleBar.load();
      currentScheduleId = activeId;
      await loadPrerolls();
    } catch (err) {
      setStatus("error", "error_prefix", I18n.t("error_prefix") + err.message);
    }
  }

  async function onScheduleSelect(scheduleId) {
    currentScheduleId = scheduleId;
    resetPreview();
    await loadPrerolls();
  }

  async function onSchedulesChanged() {
    // Schedules list changed (create/edit/delete) — reload current
  }

  async function loadPrerolls() {
    try {
      const data = await PrerollAPI.getPrerolls(currentScheduleId);
      currentVideos = data.videos;
      currentProbability = data.empty_probability;

      const pct = Math.round(currentProbability * 100);
      const sliderEl = document.getElementById("prob-slider");
      const valueEl = document.getElementById("prob-value");
      if (sliderEl) sliderEl.value = pct;
      if (valueEl) valueEl.textContent = pct + "%";

      VideoList.render("list-enabled", "list-disabled", currentVideos, onLocalChange, openPreview);
      updateStats();
      setStatus("synced", "synced");
    } catch (err) {
      setStatus("error", "error_prefix", I18n.t("error_prefix") + err.message);
    }
  }

  function onLocalChange() {
    setStatus("unsaved", "unsaved");
    updateStats();
  }

  function getSliderProbability() {
    const el = document.getElementById("prob-slider");
    return el ? parseInt(el.value, 10) / 100 : 0;
  }

  function updateStats() {
    const enabled = VideoList.getEnabledCount();
    const prob = getSliderProbability();
    const empty = computeEmptyCount(enabled, prob);
    const total = enabled + empty;
    const chance = total > 0 ? Math.round((enabled / total) * 100) : 0;

    els.statVideos.textContent = enabled;
    els.statChance.textContent = chance;
  }

  function computeEmptyCount(videoCount, probability) {
    if (videoCount === 0 || probability <= 0) return 0;
    if (probability >= 1) return videoCount;
    return Math.ceil((videoCount * probability) / (1 - probability));
  }

  function setStatus(state, key, dynamic) {
    currentStatusState = state;
    currentStatusKey = key;
    currentStatusDynamic = dynamic || null;
    renderStatus();
  }

  function renderStatus() {
    if (!els.dot) return;
    els.dot.className = "header__dot header__dot--" + currentStatusState;
    els.label.textContent = currentStatusDynamic || I18n.t(currentStatusKey);
  }

  function refreshStatus() {
    renderStatus();
  }

  function resetPreview() {
    currentPreviewVideo = null;
    els.previewVideo.pause();
    els.previewVideo.removeAttribute("src");
    els.previewVideo.load();
    els.previewEmpty.style.display = "flex";
    els.previewPlayer.style.display = "none";
    els.previewError.style.display = "none";
  }

  async function save() {
    els.saveBtn.disabled = true;
    setStatus("unsaved", "saving");

    try {
      const states = VideoList.getStates();
      const probability = getSliderProbability();
      await PrerollAPI.savePrerolls(currentScheduleId, states, probability);
      setStatus("synced", "synced");
      updateStats();
    } catch (err) {
      setStatus("error", "error_prefix", I18n.t("error_prefix") + err.message);
    } finally {
      els.saveBtn.disabled = false;
    }
  }

  async function rescan() {
    els.rescanBtn.disabled = true;
    try {
      const data = await PrerollAPI.rescan(currentScheduleId);
      currentVideos = data.videos;
      VideoList.render("list-enabled", "list-disabled", currentVideos, onLocalChange, openPreview);
      updateStats();
    } catch (err) {
      setStatus("error", "error_rescan", I18n.t("error_rescan") + err.message);
    } finally {
      els.rescanBtn.disabled = false;
    }
  }

  function openPreview(video) {
    currentPreviewVideo = video;
    const src = "/api/prerolls/preview/" + encodeURIComponent(video.relative_path);

    els.previewEmpty.style.display = "none";
    els.previewPlayer.style.display = "flex";
    els.previewError.style.display = "none";
    els.previewVideo.style.display = "block";

    els.previewFilename.textContent = video.filename;
    els.previewPath.textContent = video.relative_path;

    els.previewVideo.pause();
    els.previewVideo.src = src;

    if (VideoList.getAutoPlay()) {
      els.previewVideo.play().catch(() => {});
    } else {
      els.previewVideo.addEventListener(
        "loadedmetadata",
        () => {
          els.previewVideo.currentTime = 0.001;
        },
        { once: true },
      );
      els.previewVideo.load();
    }

    VideoList.setSelected(video.relative_path);
  }

  function bindEvents() {
    els.saveBtn.addEventListener("click", save);
    els.rescanBtn.addEventListener("click", rescan);

    document.addEventListener("input", (e) => {
      if (e.target.id !== "prob-slider") return;
      const val = parseInt(e.target.value, 10);
      const valueEl = document.getElementById("prob-value");
      if (valueEl) valueEl.textContent = val + "%";
      onLocalChange();
    });

    els.autoPlayBtn.addEventListener("click", () => {
      const next = !VideoList.getAutoPlay();
      VideoList.setAutoPlay(next);
      updateAutoPlayBtn();
    });

    els.plexCurrentBtn.addEventListener("click", showPlexCurrentPopup);
    els.calendarBtn.addEventListener("click", () => ScheduleCalendar.open());

    els.previewVideo.addEventListener("error", () => {
      els.previewVideo.style.display = "none";
      if (currentPreviewVideo) {
        const ext = currentPreviewVideo.filename.split(".").pop().toLowerCase();
        els.previewError.textContent = I18n.t("format_unsupported_ext", { ext });
      } else {
        els.previewError.textContent = I18n.t("read_error");
      }
      els.previewError.style.display = "block";
    });

    els.previewVideo.addEventListener("loadeddata", () => {
      els.previewVideo.style.display = "block";
      els.previewError.style.display = "none";
    });
  }

  async function showPlexCurrentPopup() {
    const existing = document.getElementById("plex-current-overlay");
    if (existing) {
      existing.remove();
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "plex-current-overlay";
    overlay.className = "plex-popup-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const popup = document.createElement("div");
    popup.className = "plex-popup";

    const header = document.createElement("div");
    header.className = "plex-popup__header";
    const title = document.createElement("span");
    title.textContent = I18n.t("plex_current_header");
    const closeBtn = document.createElement("button");
    closeBtn.className = "plex-popup__close";
    closeBtn.textContent = "\u00D7";
    closeBtn.addEventListener("click", () => overlay.remove());
    header.appendChild(title);
    header.appendChild(closeBtn);
    popup.appendChild(header);

    const body = document.createElement("div");
    body.className = "plex-popup__body";
    body.textContent = "\u2026";
    popup.appendChild(body);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    try {
      const data = await PrerollAPI.getPlexCurrent();
      const raw = data.value || "";
      body.innerHTML = "";

      const label = document.createElement("div");
      label.className = "plex-popup__label";
      label.textContent = I18n.t("plex_current_label");
      body.appendChild(label);

      if (!raw) {
        const empty = document.createElement("div");
        empty.className = "plex-popup__empty";
        empty.textContent = I18n.t("plex_current_empty");
        body.appendChild(empty);
      } else {
        const list = document.createElement("ul");
        list.className = "plex-popup__list";
        raw
          .split(";")
          .filter(Boolean)
          .forEach((path) => {
            const li = document.createElement("li");
            li.className = "plex-popup__item";
            li.textContent = path.trim();
            list.appendChild(li);
          });
        body.appendChild(list);

        const raw_block = document.createElement("div");
        raw_block.className = "plex-popup__raw";
        raw_block.textContent = raw;
        body.appendChild(raw_block);
      }
    } catch (err) {
      body.textContent = I18n.t("error_prefix") + err.message;
    }
  }

  function updateAutoPlayBtn() {
    const on = VideoList.getAutoPlay();
    els.autoPlayBtn.textContent = I18n.t(on ? "autoplay_on" : "autoplay_off");
    els.autoPlayBtn.title = I18n.t("autoplay_title");
    els.autoPlayBtn.classList.toggle("btn--ghost", on);
    els.autoPlayBtn.classList.toggle("btn--danger", !on);
  }

  return { init, updateAutoPlayBtn, refreshStatus };
})();

document.addEventListener("DOMContentLoaded", () => {
  I18n.init();
  window.addEventListener("langchange", () => {
    I18n.applyDOM();
    App.updateAutoPlayBtn();
    App.refreshStatus();
    VideoList.rerender();
    ScheduleBar.render();
    ScheduleCalendar.close();
  });
  App.init();
});
