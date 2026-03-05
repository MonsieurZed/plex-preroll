/**
 * Composant pill d'une vidéo dans la liste des pre-rolls.
 * Affiche une brique compacte draggable avec play, nom et poids.
 */

const VideoItem = {
  create(video, onWeightChange, onPlay) {
    const pill = document.createElement("div");
    pill.className = "video-item" + (video.enabled ? "" : " video-item--disabled");
    pill.dataset.path = video.relative_path;
    pill.draggable = true;

    pill.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", video.relative_path);
      e.dataTransfer.effectAllowed = "move";
      pill.classList.add("video-item--dragging");
    });

    pill.addEventListener("dragend", () => {
      pill.classList.remove("video-item--dragging");
    });

    pill.addEventListener("click", (e) => {
      if (e.target.closest(".video-item__weight")) return;
      onPlay(video);
    });

    const play = document.createElement("button");
    play.className = "video-item__play";
    play.textContent = "\u25B6";
    play.title = I18n.t("play_title");

    const name = document.createElement("span");
    name.className = "video-item__name";
    name.textContent = video.filename;
    name.title = video.relative_path;

    pill.appendChild(play);
    pill.appendChild(name);

    const WEIGHTS = [1, 2, 5, 10];
    let currentWeight = video.weight || 1;

    const weightBadge = document.createElement("span");
    weightBadge.className = "video-item__weight-badge";
    weightBadge.textContent = "x" + currentWeight;
    weightBadge.title = I18n.t("weight_change", { n: currentWeight });

    weightBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      const nextIdx = (WEIGHTS.indexOf(currentWeight) + 1) % WEIGHTS.length;
      currentWeight = WEIGHTS[nextIdx];
      weightBadge.textContent = "x" + currentWeight;
      weightBadge.title = I18n.t("weight_change", { n: currentWeight });
      onWeightChange(video.relative_path, currentWeight);
    });

    pill.appendChild(weightBadge);

    return pill;
  },
};
