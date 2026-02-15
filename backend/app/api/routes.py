from fastapi import APIRouter

from app.api.v1 import ai, dashboards, datasets, teams

router = APIRouter()
router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
router.include_router(ai.router, prefix="/ai", tags=["ai"])
router.include_router(dashboards.router, prefix="/dashboards", tags=["dashboards"])
router.include_router(dashboards.public_router, prefix="/public", tags=["public"])
router.include_router(teams.router, prefix="/teams", tags=["teams"])
