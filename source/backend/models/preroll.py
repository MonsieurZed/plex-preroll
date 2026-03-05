"""
Modèles Pydantic pour les pre-roll vidéos et les schedules.
Définit les structures de données pour l'API.
"""

from pydantic import BaseModel, Field


class PrerollVideo(BaseModel):
    filename: str
    relative_path: str
    plex_path: str
    enabled: bool = True
    weight: int = Field(default=1, ge=1, le=10)
    subfolder: str | None = None


class PrerollConfig(BaseModel):
    schedule_id: str = "base"
    videos: list[PrerollVideo]
    empty_probability: float = 0.0
    plex_current: str = ""


class PrerollSaveRequest(BaseModel):
    schedule_id: str = "base"
    videos: list[dict]
    empty_probability: float


class PrerollSaveResponse(BaseModel):
    success: bool
    plex_value: str
    video_count: int
    empty_count: int


class Schedule(BaseModel):
    id: str
    name: str
    start: str | None = None
    end: str | None = None
    priority: int = 0
    is_active: bool = False
    enabled: bool = True
    in_range: bool = False


class ScheduleListResponse(BaseModel):
    schedules: list[Schedule]
    active_schedule_id: str


class ScheduleCreateRequest(BaseModel):
    name: str
    start: str | None = None
    end: str | None = None
    priority: int = 10


class ScheduleUpdateRequest(BaseModel):
    name: str | None = None
    start: str | None = None
    end: str | None = None
    priority: int | None = None
    enabled: bool | None = None
