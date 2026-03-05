"""
Service de gestion de la configuration des pre-rolls avec schedules.
Persistence JSON, fusion avec le scan, construction du string Plex,
évaluation des schedules saisonniers.
"""

import json
import logging
import math
import re
from datetime import date
from pathlib import Path

from config import settings
from models.preroll import PrerollVideo, Schedule
from services.scanner_service import scan_preroll_directory

logger = logging.getLogger(__name__)


DEFAULT_SCHEDULES = {
    "base": {
        "name": "Base",
        "start": None,
        "end": None,
        "priority": 0,
        "videos": {},
        "empty_probability": 0.0,
    },
    "noel": {
        "name": "Noël",
        "start": "12-15",
        "end": "12-31",
        "priority": 10,
        "videos": {},
        "empty_probability": 0.3,
    },
    "nouvel_an": {
        "name": "Nouvel An",
        "start": "12-25",
        "end": "01-01",
        "priority": 20,
        "videos": {},
        "empty_probability": 0.3,
    },
    "halloween": {
        "name": "Halloween",
        "start": "10-24",
        "end": "10-31",
        "priority": 10,
        "videos": {},
        "empty_probability": 0.3,
    },
}


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[àáâãäå]", "a", slug)
    slug = re.sub(r"[èéêë]", "e", slug)
    slug = re.sub(r"[ìíîï]", "i", slug)
    slug = re.sub(r"[òóôõö]", "o", slug)
    slug = re.sub(r"[ùúûü]", "u", slug)
    slug = re.sub(r"[ñ]", "n", slug)
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    slug = slug.strip("_")
    return slug or "schedule"


def load_saved_config() -> dict:
    config_path = Path(settings.config_path)
    if not config_path.exists():
        return _build_default_config()

    try:
        with open(config_path, "r") as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        logger.error("Erreur lecture config JSON: %s", e)
        return _build_default_config()

    if "schedules" not in data:
        data = _migrate_config(data)
        _write_config(data)

    return data


def _build_default_config() -> dict:
    return {
        "schedules": {k: dict(v) for k, v in DEFAULT_SCHEDULES.items()},
        "active_schedule_id": "base",
    }


def _migrate_config(data: dict) -> dict:
    logger.info("Migration de l'ancien format de config vers schedules")
    old_videos = data.get("videos", {})
    old_probability = data.get("empty_probability", 0.0)

    base_videos = {}
    for path, enabled in old_videos.items():
        if isinstance(enabled, bool):
            base_videos[path] = {"enabled": enabled, "weight": 1}
        elif isinstance(enabled, dict):
            base_videos[path] = enabled
        else:
            base_videos[path] = {"enabled": bool(enabled), "weight": 1}

    new_config = _build_default_config()
    new_config["schedules"]["base"]["videos"] = base_videos
    new_config["schedules"]["base"]["empty_probability"] = old_probability
    return new_config


def _write_config(data: dict) -> None:
    config_path = Path(settings.config_path)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def save_config(schedule_id: str, video_states: dict[str, dict], empty_probability: float) -> None:
    config = load_saved_config()
    schedules = config.get("schedules", {})

    if schedule_id not in schedules:
        logger.warning("Schedule '%s' introuvable, sauvegarde ignorée", schedule_id)
        return

    schedules[schedule_id]["videos"] = video_states
    schedules[schedule_id]["empty_probability"] = empty_probability
    _write_config(config)


def get_merged_prerolls(schedule_id: str = "base", plex_current: str = "") -> tuple[list[PrerollVideo], float]:
    scanned = scan_preroll_directory()
    config = load_saved_config()
    schedules = config.get("schedules", {})

    if schedule_id not in schedules:
        schedule_id = "base"

    schedule_data = schedules.get(schedule_id, {})
    saved_videos = schedule_data.get("videos", {})
    empty_probability = schedule_data.get("empty_probability", 0.0)

    is_base = schedule_id == "base"

    if not saved_videos and is_base and plex_current:
        states, derived_prob = _parse_plex_current(plex_current, scanned)
        for video in scanned:
            if video.relative_path in states:
                video.enabled = states[video.relative_path]
        if derived_prob > 0:
            empty_probability = derived_prob
    else:
        for video in scanned:
            if video.relative_path in saved_videos:
                state = saved_videos[video.relative_path]
                video.enabled = state.get("enabled", True)
                video.weight = state.get("weight", 1)
            else:
                video.enabled = is_base
                video.weight = 1

    return scanned, empty_probability


def _parse_plex_current(plex_current: str, videos: list[PrerollVideo]) -> tuple[dict[str, bool], float]:
    if not plex_current:
        return {}, 0.0

    parts = plex_current.split(";")
    active_paths = {p.strip() for p in parts if p.strip()}
    empty_count = sum(1 for p in parts if not p.strip())
    total = len(parts)

    empty_probability = empty_count / total if total > 0 else 0.0

    states = {}
    for v in videos:
        states[v.relative_path] = v.plex_path in active_paths

    return states, empty_probability


def build_plex_string(videos: list[PrerollVideo], empty_probability: float) -> tuple[str, int, int]:
    enabled = [v for v in videos if v.enabled]
    video_count = len(enabled)

    if video_count == 0:
        return "", 0, 0

    weighted_paths = []
    for v in enabled:
        weight = max(1, min(5, v.weight))
        weighted_paths.extend([v.plex_path] * weight)

    weighted_count = len(weighted_paths)

    empty_count = 0
    if 0 < empty_probability < 1.0:
        empty_count = math.ceil(weighted_count * empty_probability / (1.0 - empty_probability))
    elif empty_probability >= 1.0:
        return ";" * weighted_count, 0, weighted_count

    parts = weighted_paths + [""] * empty_count
    plex_value = ";".join(parts)

    return plex_value, video_count, empty_count


# --- Schedule CRUD ---

def get_all_schedules() -> tuple[list[dict], str]:
    config = load_saved_config()
    active_id = config.get("active_schedule_id", "base")
    schedules = []
    for sid, sdata in config.get("schedules", {}).items():
        schedules.append({
            "id": sid,
            "name": sdata.get("name", sid),
            "start": sdata.get("start"),
            "end": sdata.get("end"),
            "priority": sdata.get("priority", 0),
            "enabled": sdata.get("enabled", True),
        })
    return schedules, active_id


def create_schedule(name: str, start: str | None, end: str | None, priority: int) -> dict:
    config = load_saved_config()
    schedules = config.get("schedules", {})

    slug = _slugify(name)
    if slug in schedules:
        i = 2
        while f"{slug}_{i}" in schedules:
            i += 1
        slug = f"{slug}_{i}"

    schedules[slug] = {
        "name": name,
        "start": start,
        "end": end,
        "priority": priority,
        "videos": {},
        "empty_probability": 0.3,
    }
    _write_config(config)

    return {"id": slug, "name": name, "start": start, "end": end, "priority": priority}


def update_schedule(schedule_id: str, update_data) -> dict | None:
    config = load_saved_config()
    schedules = config.get("schedules", {})

    if schedule_id not in schedules:
        return None

    sdata = schedules[schedule_id]
    if update_data.name is not None:
        sdata["name"] = update_data.name
    if update_data.start is not None:
        sdata["start"] = update_data.start
    if update_data.end is not None:
        sdata["end"] = update_data.end
    if update_data.priority is not None:
        sdata["priority"] = update_data.priority
    if update_data.enabled is not None:
        sdata["enabled"] = update_data.enabled

    _write_config(config)

    return {
        "id": schedule_id,
        "name": sdata["name"],
        "start": sdata.get("start"),
        "end": sdata.get("end"),
        "priority": sdata.get("priority", 0),
        "enabled": sdata.get("enabled", True),
    }


def delete_schedule(schedule_id: str) -> bool:
    if schedule_id == "base":
        return False

    config = load_saved_config()
    schedules = config.get("schedules", {})

    if schedule_id not in schedules:
        return False

    del schedules[schedule_id]

    if config.get("active_schedule_id") == schedule_id:
        config["active_schedule_id"] = "base"

    _write_config(config)
    return True


# --- Schedule evaluation ---

def evaluate_active_schedule() -> str:
    config = load_saved_config()
    today = date.today()
    today_mmdd = (today.month, today.day)

    best_id = "base"
    best_priority = -1

    for sid, sdata in config.get("schedules", {}).items():
        if sid == "base":
            continue
        if not sdata.get("enabled", True):
            continue
        start_str = sdata.get("start")
        end_str = sdata.get("end")
        if not start_str or not end_str:
            continue

        try:
            start_month, start_day = map(int, start_str.split("-"))
            end_month, end_day = map(int, end_str.split("-"))
        except (ValueError, AttributeError):
            continue

        start = (start_month, start_day)
        end = (end_month, end_day)

        if start <= end:
            active = start <= today_mmdd <= end
        else:
            active = today_mmdd >= start or today_mmdd <= end

        priority = sdata.get("priority", 0)
        if active and priority > best_priority:
            best_id = sid
            best_priority = priority

    return best_id


def set_active_schedule(schedule_id: str) -> None:
    config = load_saved_config()
    config["active_schedule_id"] = schedule_id
    _write_config(config)
