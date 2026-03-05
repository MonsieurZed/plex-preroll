/**
 * Module d'internationalisation (i18n).
 * Détection automatique de la langue navigateur, dictionnaire FR/EN.
 * Expose I18n.t(key, params), I18n.setLang(code), I18n.getLang(), I18n.applyDOM().
 * Émet un événement CustomEvent("langchange") sur window lors d'un changement de langue.
 */

const I18n = (() => {
  const SUPPORTED = ["fr", "en"];
  const DEFAULT_LANG = "fr";
  const STORAGE_KEY = "plex-preroll-lang";

  const DICT = {
    fr: {
      loading: "Chargement\u2026",
      synced: "Synchronis\u00e9",
      unsaved: "Non sauvegard\u00e9",
      saving: "Sauvegarde\u2026",
      error_prefix: "Erreur\u00a0: ",
      error_rescan: "Erreur rescan\u00a0: ",
      skip: "Skip",
      skip_hint: "Probabilit\u00e9 de ne jouer aucun pr\u00e9-roll (0\u00a0% = toujours, 100\u00a0% = jamais)",
      stat_active: "actives",
      stat_intro: "Intro",
      rescan_title: "Rescanner le dossier",
      save_btn: "Sync",
      col_disabled: "D\u00e9sactiv\u00e9es",
      col_enabled: "Activ\u00e9es",
      col_preview: "Aper\u00e7u",
      autoplay_on: "\u25B6\u00a0Auto",
      autoplay_off: "\u23F8\u00a0Pause",
      autoplay_title: "Lecture automatique au clic",
      select_video: "S\u00e9lectionnez une vid\u00e9o",
      format_unsupported: "Format non support\u00e9 par le navigateur",
      format_unsupported_ext: "Format .{ext} non support\u00e9 par le navigateur",
      read_error: "Impossible de lire cette vid\u00e9o",
      modify_schedule: "Modifier le schedule",
      no_video: "Aucune vid\u00e9o",
      disable_all: "Tout d\u00e9sactiver",
      enable_all: "Tout activer",
      root_group: "Racine",
      play_title: "Aper\u00e7u",
      weight_change: "Poids\u00a0: x{n} (clic pour changer)",
      weight_increase: "Poids\u00a0: x1 (clic pour augmenter)",
      new_schedule: "Nouveau schedule",
      select_schedule: "S\u00e9lectionnez un schedule",
      edit_prefix: "Modifier\u00a0: ",
      field_name: "Nom",
      field_priority: "Priorit\u00e9",
      field_start: "D\u00e9but",
      field_end: "Fin",
      btn_delete: "Supprimer",
      btn_cancel: "Annuler",
      btn_create: "Cr\u00e9er",
      btn_save: "Enregistrer",
      schedule_placeholder: "Ex\u00a0: No\u00ebl",
      toggle_on: "ON",
      toggle_off: "OFF",
      unsaved_warning: "Des modifications non sauvegard\u00e9es seront perdues. Continuer ?",
      plex_current_title: "Config Plex actuelle",
      plex_current_header: "Configuration Plex actuelle",
      plex_current_empty: "Aucune valeur d\u00e9finie dans Plex.",
      plex_current_label: "CinemaTrailersPrerollID",
      legend_active: "Actif",
      legend_overridden: "Priorit\u00e9 inf\u00e9rieure",
      legend_enabled: "Hors p\u00e9riode",
      legend_off: "D\u00e9sactiv\u00e9",
      calendar_title: "Calendrier",
      calendar_btn_title: "Voir le calendrier annuel",
      months: ["Janvier", "F\u00e9vrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Ao\u00fbt", "Septembre", "Octobre", "Novembre", "D\u00e9cembre"],
    },
    en: {
      loading: "Loading\u2026",
      synced: "Synced",
      unsaved: "Unsaved",
      saving: "Saving\u2026",
      error_prefix: "Error: ",
      error_rescan: "Rescan error: ",
      skip: "Skip",
      skip_hint: "Probability of playing no pre-roll (0\u00a0% = always, 100\u00a0% = never)",
      stat_active: "active",
      stat_intro: "Intro",
      rescan_title: "Rescan directory",
      save_btn: "Sync",
      col_disabled: "Disabled",
      col_enabled: "Enabled",
      col_preview: "Preview",
      autoplay_on: "\u25B6\u00a0Auto",
      autoplay_off: "\u23F8\u00a0Pause",
      autoplay_title: "Auto-play on click",
      select_video: "Select a video",
      format_unsupported: "Format not supported by browser",
      format_unsupported_ext: "Format .{ext} not supported by browser",
      read_error: "Cannot read this video",
      modify_schedule: "Edit schedule",
      no_video: "No video",
      disable_all: "Disable all",
      enable_all: "Enable all",
      root_group: "Root",
      play_title: "Preview",
      weight_change: "Weight: x{n} (click to change)",
      weight_increase: "Weight: x1 (click to increase)",
      new_schedule: "New schedule",
      select_schedule: "Select a schedule",
      edit_prefix: "Edit: ",
      field_name: "Name",
      field_priority: "Priority",
      field_start: "Start",
      field_end: "End",
      btn_delete: "Delete",
      btn_cancel: "Cancel",
      btn_create: "Create",
      btn_save: "Save",
      schedule_placeholder: "E.g.: Christmas",
      toggle_on: "ON",
      toggle_off: "OFF",
      unsaved_warning: "Unsaved changes will be lost. Continue?",
      plex_current_title: "Current Plex config",
      plex_current_header: "Current Plex configuration",
      plex_current_empty: "No value set in Plex.",
      plex_current_label: "CinemaTrailersPrerollID",
      legend_active: "Active",
      legend_overridden: "Lower priority",
      legend_enabled: "Out of period",
      legend_off: "Disabled",
      calendar_title: "Calendar",
      calendar_btn_title: "View annual calendar",
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    },
  };

  function detectLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
    const nav = (navigator.language || navigator.userLanguage || "fr").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : DEFAULT_LANG;
  }

  let currentLang = detectLang();

  function getLang() {
    return currentLang;
  }

  function setLang(code) {
    if (!SUPPORTED.includes(code) || code === currentLang) return;
    currentLang = code;
    localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;
    applyDOM();
    window.dispatchEvent(new CustomEvent("langchange", { detail: { lang: code } }));
  }

  function t(key, params) {
    const dict = DICT[currentLang] || DICT[DEFAULT_LANG];
    let str = dict[key];
    if (str === undefined) {
      str = (DICT[DEFAULT_LANG] || {})[key] || key;
    }
    if (params && typeof str === "string") {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace("{" + k + "}", v);
      });
    }
    return str;
  }

  function applyDOM() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      el.title = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.placeholder = t(key);
    });
    const langBtns = document.querySelectorAll("[data-lang-btn]");
    langBtns.forEach((btn) => {
      btn.classList.toggle("lang-btn--active", btn.getAttribute("data-lang-btn") === currentLang);
    });
  }

  function init() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.addEventListener("click", () => setLang(btn.getAttribute("data-lang-btn")));
    });
    applyDOM();
  }

  return { init, t, getLang, setLang, applyDOM, SUPPORTED };
})();
