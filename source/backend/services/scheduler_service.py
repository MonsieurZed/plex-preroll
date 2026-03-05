"""
Service de planification automatique des schedules.
Évalue périodiquement le schedule actif et pousse vers Plex si changement.
"""

import asyncio
import logging

from services import config_service, plex_service

logger = logging.getLogger(__name__)

EVALUATION_INTERVAL_SECONDS = 3600


async def run_scheduler():
    logger.info("Planificateur de schedules démarré (intervalle: %ds)", EVALUATION_INTERVAL_SECONDS)

    await evaluate_and_push()

    while True:
        await asyncio.sleep(EVALUATION_INTERVAL_SECONDS)
        try:
            await evaluate_and_push()
        except Exception as e:
            logger.error("Erreur dans le planificateur: %s", e)


async def evaluate_and_push():
    config = config_service.load_saved_config()
    current_active = config.get("active_schedule_id", "base")

    new_active = config_service.evaluate_active_schedule()

    if new_active != current_active:
        logger.info("Changement de schedule: %s -> %s", current_active, new_active)
        config_service.set_active_schedule(new_active)
        await push_schedule_to_plex(new_active)
    else:
        logger.debug("Schedule inchangé: %s", current_active)


async def push_schedule_to_plex(schedule_id: str):
    plex_current = await plex_service.get_current_prerolls()
    videos, empty_probability = config_service.get_merged_prerolls(
        schedule_id=schedule_id, plex_current=plex_current
    )
    plex_value, video_count, empty_count = config_service.build_plex_string(
        videos, empty_probability
    )

    success = await plex_service.set_prerolls(plex_value)
    if success:
        logger.info("Plex mis à jour avec le schedule '%s' (%d vidéos, %d vides)", schedule_id, video_count, empty_count)
    else:
        logger.error("Échec de la mise à jour Plex pour le schedule '%s'", schedule_id)
