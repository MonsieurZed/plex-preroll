/**
 * Composant de la barre de statut.
 * Affiche l'état de synchronisation avec Plex et les statistiques.
 */

const StatusBar = (() => {
    let elements = {};

    function init() {
        elements = {
            dot: document.getElementById("status-dot"),
            label: document.getElementById("status-label"),
            videoCount: document.getElementById("stat-videos"),
            emptyCount: document.getElementById("stat-empty"),
        };
    }

    function setSynced(videoCount, emptyCount) {
        if (!elements.dot) return;
        elements.dot.className = "status-bar__dot status-bar__dot--synced";
        elements.label.textContent = "Synchronis\u00e9 avec Plex";
        elements.videoCount.textContent = videoCount;
        elements.emptyCount.textContent = emptyCount;
    }

    function setUnsaved() {
        if (!elements.dot) return;
        elements.dot.className = "status-bar__dot status-bar__dot--unsaved";
        elements.label.textContent = "Modifications non sauvegard\u00e9es";
    }

    function setError(msg) {
        if (!elements.dot) return;
        elements.dot.className = "status-bar__dot status-bar__dot--error";
        elements.label.textContent = msg || "Erreur de synchronisation";
    }

    function setLoading() {
        if (!elements.dot) return;
        elements.dot.className = "status-bar__dot status-bar__dot--unsaved";
        elements.label.textContent = "Sauvegarde en cours...";
    }

    return { init, setSynced, setUnsaved, setError, setLoading };
})();
