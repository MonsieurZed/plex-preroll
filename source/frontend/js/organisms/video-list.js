/**
 * Composant de la liste de vidéos en deux colonnes (désactivées / activées).
 * Gère les sections dépliables, poids, drag-and-drop et rendu séparé.
 */

const VideoList = (() => {
  let videoStates = {};
  let currentArgs = {};
  let selectedPath = null;
  let autoPlayEnabled = true;

  function groupVideos(videos) {
    const groups = {};
    videos.forEach((v) => {
      const key = v.subfolder || "__root__";
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    });
    return groups;
  }

  function sortedGroupKeys(groups) {
    return Object.keys(groups).sort((a, b) => {
      if (a === "__root__") return -1;
      if (b === "__root__") return 1;
      return a.localeCompare(b);
    });
  }

  function createGroupHeader(name, videos, actionLabel, onAction) {
    const header = document.createElement("div");
    header.className = "video-list__group-header";

    const title = document.createElement("span");
    title.className = "video-list__group-title";

    const arrow = document.createElement("span");
    arrow.className = "video-list__group-arrow";
    arrow.textContent = "\u25BC";

    const label = name === "__root__" ? I18n.t("root_group") : name;
    title.appendChild(arrow);
    title.appendChild(document.createTextNode(" " + label + " (" + videos.length + ")"));

    const actions = document.createElement("div");
    actions.className = "video-list__group-actions";

    const btn = document.createElement("button");
    btn.className = "btn btn--ghost btn--sm";
    btn.textContent = actionLabel;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onAction(videos);
    });
    actions.appendChild(btn);

    header.appendChild(title);
    header.appendChild(actions);

    return header;
  }

  function renderList(container, videos, isEnabledColumn, onWeightChange, onBulkToggle, onPlay) {
    container.innerHTML = "";

    if (videos.length === 0) {
      const empty = document.createElement("div");
      empty.className = "video-list__empty";
      empty.textContent = I18n.t("no_video");
      container.appendChild(empty);
      return;
    }

    const groups = groupVideos(videos);
    const keys = sortedGroupKeys(groups);

    const actionLabel = isEnabledColumn ? I18n.t("disable_all") : I18n.t("enable_all");
    const targetState = !isEnabledColumn;

    keys.forEach((key) => {
      const groupVids = groups[key];

      if (keys.length === 1 && key === "__root__") {
        const items = document.createElement("div");
        items.className = "video-list__group-items";
        groupVids.forEach((v) => {
          const item = VideoItem.create(v, onWeightChange, onPlay);
          items.appendChild(item);
        });
        container.appendChild(items);
        return;
      }

      const group = document.createElement("div");
      group.className = "video-list__group";

      const header = createGroupHeader(key, groupVids, actionLabel, (vids) => {
        onBulkToggle(vids, targetState);
      });
      header.addEventListener("click", () => {
        group.classList.toggle("video-list__group--collapsed");
      });

      const items = document.createElement("div");
      items.className = "video-list__group-items";

      groupVids.forEach((v) => {
        const item = VideoItem.create(v, onWeightChange, onPlay);
        items.appendChild(item);
      });

      group.appendChild(header);
      group.appendChild(items);
      container.appendChild(group);
    });
  }

  function setupDropZone(container, targetEnabled, onDrop) {
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      container.classList.add("column__content--drag-over");
    });

    container.addEventListener("dragleave", (e) => {
      if (!container.contains(e.relatedTarget)) {
        container.classList.remove("column__content--drag-over");
      }
    });

    container.addEventListener("drop", (e) => {
      e.preventDefault();
      container.classList.remove("column__content--drag-over");
      const path = e.dataTransfer.getData("text/plain");
      if (path && videoStates[path]) {
        const currentEnabled = videoStates[path].enabled;
        if (currentEnabled !== targetEnabled) {
          onDrop(path, targetEnabled);
        }
      }
    });
  }

  function render(enabledId, disabledId, videos, onStateChange, onPlay) {
    videoStates = {};
    videos.forEach((v) => {
      videoStates[v.relative_path] = {
        enabled: v.enabled,
        weight: v.weight || 1,
      };
    });

    currentArgs = { enabledId, disabledId, videos, onStateChange, onPlay };

    const enabledContainer = document.getElementById(enabledId);
    const disabledContainer = document.getElementById(disabledId);

    if (enabledContainer && !enabledContainer._dropInit) {
      setupDropZone(enabledContainer, true, (path) => {
        videoStates[path].enabled = true;
        rerender();
        currentArgs.onStateChange();
      });
      enabledContainer._dropInit = true;
    }

    if (disabledContainer && !disabledContainer._dropInit) {
      setupDropZone(disabledContainer, false, (path) => {
        videoStates[path].enabled = false;
        rerender();
        currentArgs.onStateChange();
      });
      disabledContainer._dropInit = true;
    }

    rerender();
  }

  function rerender() {
    const { enabledId, disabledId, videos, onStateChange, onPlay } = currentArgs;
    const enabledContainer = document.getElementById(enabledId);
    const disabledContainer = document.getElementById(disabledId);
    if (!enabledContainer || !disabledContainer) return;

    const updatedVideos = getUpdatedVideos(videos);
    const enabledVideos = updatedVideos.filter((v) => v.enabled);
    const disabledVideos = updatedVideos.filter((v) => !v.enabled);

    const onWeightChange = (id, weight) => {
      videoStates[id].weight = weight;
      rerender();
      onStateChange();
    };

    const onBulkToggle = (vids, enabled) => {
      vids.forEach((v) => {
        videoStates[v.relative_path].enabled = enabled;
      });
      rerender();
      onStateChange();
    };

    const guardedPlay = (video) => {
      onPlay(video);
    };

    renderList(enabledContainer, enabledVideos, true, onWeightChange, onBulkToggle, guardedPlay);
    renderList(disabledContainer, disabledVideos, false, onWeightChange, onBulkToggle, guardedPlay);

    const countEnabled = document.getElementById("count-enabled");
    const countDisabled = document.getElementById("count-disabled");
    if (countEnabled) countEnabled.textContent = enabledVideos.length;
    if (countDisabled) countDisabled.textContent = disabledVideos.length;

    if (selectedPath) applySelected();
  }

  function setSelected(path) {
    selectedPath = path;
    applySelected();
  }

  function applySelected() {
    document.querySelectorAll(".video-item--selected").forEach((el) => {
      el.classList.remove("video-item--selected");
    });
    if (selectedPath) {
      const item = document.querySelector('[data-path="' + CSS.escape(selectedPath) + '"]');
      if (item) item.classList.add("video-item--selected");
    }
  }

  function getUpdatedVideos(originalVideos) {
    return originalVideos.map((v) => {
      const state = videoStates[v.relative_path];
      if (state) {
        return { ...v, enabled: state.enabled, weight: state.weight };
      }
      return v;
    });
  }

  function getStates() {
    return Object.entries(videoStates).map(([path, state]) => ({
      relative_path: path,
      enabled: state.enabled,
      weight: state.weight,
    }));
  }

  function getEnabledCount() {
    return Object.values(videoStates).filter((s) => s.enabled).length;
  }

  function setAutoPlay(val) {
    autoPlayEnabled = val;
  }

  function getAutoPlay() {
    return autoPlayEnabled;
  }

  return { render, rerender, getStates, getEnabledCount, setSelected, setAutoPlay, getAutoPlay };
})();
