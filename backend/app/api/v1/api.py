from fastapi import APIRouter
from app.api.v1.endpoints import auth, analysis, reports, history, alerts, fields, calendar

api_router = APIRouter()

api_router.include_router(auth.router,     prefix="/auth",     tags=["auth"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(reports.router,  prefix="/reports",  tags=["reports"])
api_router.include_router(history.router,  prefix="/history",  tags=["history"])
api_router.include_router(alerts.router,   prefix="/alerts",   tags=["alerts"])
api_router.include_router(fields.router,   prefix="/fields",   tags=["fields"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])