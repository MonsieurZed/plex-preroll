"""
Service de communication avec l'API Plex.
Lit et écrit le paramètre CinemaTrailersPrerollID.
"""

import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)


async def get_current_prerolls() -> str:
    """
    Récupère la valeur actuelle de CinemaTrailersPrerollID depuis Plex.

    :return: Chaîne brute du paramètre Plex (séparée par des ;)
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.plex_url}/:/prefs",
                headers={
                    "X-Plex-Token": settings.plex_token,
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

            for setting in data.get("MediaContainer", {}).get("Setting", []):
                if setting.get("id") == "CinemaTrailersPrerollID":
                    return setting.get("value", "")

    except Exception as e:
        logger.error("Erreur lors de la lecture des préférences Plex: %s", e)

    return ""


async def set_prerolls(plex_value: str) -> bool:
    """
    Écrit la valeur CinemaTrailersPrerollID dans les préférences Plex.

    :param plex_value: Chaîne de chemins séparés par des ; à envoyer à Plex
    :return: True si la mise à jour a réussi
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.put(
                f"{settings.plex_url}/:/prefs",
                params={"CinemaTrailersPrerollID": plex_value},
                headers={
                    "X-Plex-Token": settings.plex_token,
                    "Accept": "application/json",
                },
            )
            return resp.status_code in (200, 201, 204)

    except Exception as e:
        logger.error("Erreur lors de l'écriture des préférences Plex: %s", e)
        return False
