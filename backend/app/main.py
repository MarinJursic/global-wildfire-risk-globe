from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    IgnitionRiskRequest,
    IgnitionRiskResponse,
    SpreadForecastRequest,
    SpreadForecastResponse,
    StoryEvent,
    VerificationMetrics,
)
from .simulation import ignition_risk, spread_forecast, verification

KNOWN_EVENT_IDS = {"evros-2023"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(
    title="EMBER Wildfire Research API",
    version="0.1.0",
    description=(
        "Typed deterministic contracts for calibrated ignition-risk, spread, and "
        "forecast-verification demonstrations. This is not an operational alert service."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "deterministic-story", "version": app.version}


@app.get("/v1/events", response_model=list[StoryEvent])
def events() -> list[StoryEvent]:
    return [
        StoryEvent(
            id="evros-2023",
            name="Alexandroupolis / Evros",
            country="Greece",
            started_at=datetime(2023, 8, 19, 6, tzinfo=UTC),
            focus={"latitude": 40.93, "longitude": 25.86},
            narrative=(
                "A deterministic replay inspired by the August 2023 Evros event. "
                "Values are illustrative and preserve an operational-style data contract."
            ),
            data_mode="cached-contract-plus-simulation",
            source_url="https://climate.copernicus.eu/esotc/2023/wildfires",
        )
    ]


@app.post("/v1/ignition-risk", response_model=IgnitionRiskResponse)
def create_ignition_risk(request: IgnitionRiskRequest) -> IgnitionRiskResponse:
    return ignition_risk(request)


@app.post("/v1/spread-forecast", response_model=SpreadForecastResponse)
def create_spread_forecast(request: SpreadForecastRequest) -> SpreadForecastResponse:
    if request.event_id not in KNOWN_EVENT_IDS:
        raise HTTPException(status_code=404, detail="Unknown story event")
    return spread_forecast(request)


@app.get("/v1/verification/{event_id}", response_model=VerificationMetrics)
def get_verification(
    event_id: str,
    forecast_hour: int = Query(default=24, ge=0, le=168),
) -> VerificationMetrics:
    if event_id not in KNOWN_EVENT_IDS:
        raise HTTPException(status_code=404, detail="Unknown story event")
    return verification(event_id, forecast_hour)
