"""
Routes API pour la gestion des schedules saisonniers.
"""

from datetime import date

from fastapi import APIRouter, HTTPException

from models.preroll import (
    Schedule,
    ScheduleCreateRequest,
    ScheduleListResponse,
    ScheduleUpdateRequest,
)
from services import config_service
from services.scheduler_service import evaluate_and_push

router = APIRouter(prefix="/api")


def _is_in_range(s: dict) -> bool:
    start_str = s.get("start")
    end_str = s.get("end")
    if not start_str or not end_str:
        return False
    today = date.today()
    today_mmdd = (today.month, today.day)
    try:
        start = tuple(map(int, start_str.split("-")))
        end = tuple(map(int, end_str.split("-")))
    except (ValueError, AttributeError):
        return False
    if start <= end:
        return start <= today_mmdd <= end
    return today_mmdd >= start or today_mmdd <= end


@router.get("/schedules", response_model=ScheduleListResponse)
async def list_schedules():
    schedules_data, active_id = config_service.get_all_schedules()
    schedules = [
        Schedule(
            id=s["id"],
            name=s["name"],
            start=s.get("start"),
            end=s.get("end"),
            priority=s.get("priority", 0),
            is_active=(s["id"] == active_id),
            enabled=s.get("enabled", True),
            in_range=_is_in_range(s),
        )
        for s in schedules_data
    ]
    return ScheduleListResponse(schedules=schedules, active_schedule_id=active_id)


@router.post("/schedules", response_model=Schedule, status_code=201)
async def create_schedule(request: ScheduleCreateRequest):
    result = config_service.create_schedule(
        name=request.name,
        start=request.start,
        end=request.end,
        priority=request.priority,
    )
    return Schedule(
        id=result["id"],
        name=result["name"],
        start=result.get("start"),
        end=result.get("end"),
        priority=result.get("priority", 0),
        is_active=False,
        enabled=True,
    )


@router.put("/schedules/{schedule_id}", response_model=Schedule)
async def update_schedule(schedule_id: str, request: ScheduleUpdateRequest):
    if schedule_id == "base" and (request.start is not None or request.end is not None):
        raise HTTPException(status_code=400, detail="Le schedule base ne peut pas avoir de dates")

    result = config_service.update_schedule(schedule_id, request)
    if not result:
        raise HTTPException(status_code=404, detail="Schedule introuvable")

    schedules_data, active_id = config_service.get_all_schedules()
    return Schedule(
        id=result["id"],
        name=result["name"],
        start=result.get("start"),
        end=result.get("end"),
        priority=result.get("priority", 0),
        is_active=(result["id"] == active_id),
        enabled=result.get("enabled", True),
        in_range=_is_in_range(result),
    )


@router.delete("/schedules/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: str):
    if schedule_id == "base":
        raise HTTPException(status_code=400, detail="Impossible de supprimer le schedule base")
    success = config_service.delete_schedule(schedule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Schedule introuvable")


@router.post("/schedules/evaluate")
async def force_evaluate():
    await evaluate_and_push()
    schedules_data, active_id = config_service.get_all_schedules()
    return {"active_schedule_id": active_id}
