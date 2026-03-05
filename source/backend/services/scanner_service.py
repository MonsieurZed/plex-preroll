"""
Service de scan du dossier de pre-roll vidéos.
Parcourt récursivement le répertoire et détecte les fichiers vidéo.
"""

import os
from pathlib import Path

from config import settings
from models.preroll import PrerollVideo

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm"}


def scan_preroll_directory() -> list[PrerollVideo]:
    """
    Scanne le dossier PREROLL_DIR récursivement pour trouver les fichiers vidéo.
    Effectue le remapping des chemins pour Plex.

    :return: Liste des vidéos détectées avec leurs chemins Plex
    """
    preroll_dir = Path(settings.preroll_dir)
    videos = []

    if not preroll_dir.exists():
        return videos

    for file_path in sorted(preroll_dir.rglob("*")):
        if not file_path.is_file():
            continue

        if file_path.suffix.lower() not in VIDEO_EXTENSIONS:
            continue

        relative = file_path.relative_to(preroll_dir)
        plex_path = f"{settings.plex_preroll_path}/{relative}"

        subfolder = None
        if relative.parent != Path("."):
            subfolder = str(relative.parent)

        videos.append(
            PrerollVideo(
                filename=file_path.name,
                relative_path=str(relative),
                plex_path=plex_path,
                enabled=True,
                subfolder=subfolder,
            )
        )

    return videos
