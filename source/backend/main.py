"""
Point d'entrée de l'application Plex Preroll Manager.
Initialise FastAPI, le middleware CORS et enregistre les routes.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.preroll import router as preroll_router
from api.routes.schedule import router as schedule_router
from services.scheduler_service import run_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Plex Preroll Manager démarré")
    scheduler_task = asyncio.create_task(run_scheduler())
    yield
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    logger.info("Plex Preroll Manager arrêté")


app = FastAPI(
    title="Plex Preroll Manager",
    description="Gestion des pre-roll vidéos Plex",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(preroll_router)
app.include_router(schedule_router)
