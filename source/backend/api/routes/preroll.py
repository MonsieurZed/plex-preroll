"""
Routes API pour la gestion des pre-rolls Plex.
Endpoints : liste, sauvegarde, rescan, santé, aperçu vidéo.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from config import settings
from models.preroll import PrerollConfig, PrerollSaveRequest, PrerollSaveResponse
from services import config_service, plex_service

router = APIRouter(prefix="/api")

MIME_MAP = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
}


@router.get("/plex/current")
async def get_plex_current():
    """Retourne la valeur brute actuelle de CinemaTrailersPrerollID depuis Plex."""
    value = await plex_service.get_current_prerolls()
    return {"value": value}


@router.get("/prerolls", response_model=PrerollConfig)
async def get_prerolls(schedule: str = "base"):
    plex_current = await plex_service.get_current_prerolls()
    videos, empty_probability = config_service.get_merged_prerolls(
        schedule_id=schedule, plex_current=plex_current
    )

    return PrerollConfig(
        schedule_id=schedule,
        videos=videos,
        empty_probability=empty_probability,
        plex_current=plex_current,
    )


@router.put("/prerolls", response_model=PrerollSaveResponse)
async def save_prerolls(request: PrerollSaveRequest):
    video_states = {
        v["relative_path"]: {"enabled": v["enabled"], "weight": v.get("weight", 1)}
        for v in request.videos
    }
    config_service.save_config(request.schedule_id, video_states, request.empty_probability)

    plex_current = await plex_service.get_current_prerolls()
    config = config_service.load_saved_config()
    active_id = config.get("active_schedule_id", "base")

    videos, empty_probability = config_service.get_merged_prerolls(
        schedule_id=request.schedule_id, plex_current=plex_current
    )
    plex_value, video_count, empty_count = config_service.build_plex_string(
        videos, empty_probability
    )

    if request.schedule_id == active_id:
        success = await plex_service.set_prerolls(plex_value)
        if not success:
            raise HTTPException(status_code=502, detail="Échec de la mise à jour Plex")
    else:
        success = True

    return PrerollSaveResponse(
        success=success,
        plex_value=plex_value,
        video_count=video_count,
        empty_count=empty_count,
    )


@router.post("/prerolls/scan", response_model=PrerollConfig)
async def rescan_prerolls(schedule: str = "base"):
    plex_current = await plex_service.get_current_prerolls()
    videos, empty_probability = config_service.get_merged_prerolls(
        schedule_id=schedule, plex_current=plex_current
    )

    return PrerollConfig(
        schedule_id=schedule,
        videos=videos,
        empty_probability=empty_probability,
        plex_current=plex_current,
    )


@router.get("/prerolls/preview/{file_path:path}")
async def preview_video(file_path: str, request: Request):
    preroll_dir = Path(settings.preroll_dir)
    full_path = preroll_dir / file_path

    try:
        resolved = full_path.resolve()
        resolved.relative_to(preroll_dir.resolve())
    except (ValueError, RuntimeError):
        raise HTTPException(status_code=403, detail="Accès interdit")

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")

    file_size = full_path.stat().st_size
    content_type = MIME_MAP.get(full_path.suffix.lower(), "application/octet-stream")

    range_header = request.headers.get("range")

    if range_header:
        range_spec = range_header.strip().split("=")[1]
        parts = range_spec.split("-")
        start = int(parts[0])
        end = int(parts[1]) if parts[1] else file_size - 1
        chunk_size = end - start + 1

        def iter_range():
            with open(full_path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    read_size = min(remaining, 65536)
                    data = f.read(read_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            iter_range(),
            status_code=206,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
                "Content-Type": content_type,
            },
        )

    def iter_file():
        with open(full_path, "rb") as f:
            while True:
                data = f.read(65536)
                if not data:
                    break
                yield data

    return StreamingResponse(
        iter_file(),
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": content_type,
        },
    )


@router.get("/health")
async def health_check():
    return {"status": "ok"}
