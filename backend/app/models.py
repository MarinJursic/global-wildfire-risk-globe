from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Horizon(StrEnum):
    H6 = "6h"
    H24 = "24h"
    H48 = "48h"
    H72 = "72h"
    D7 = "7d"


class Coordinates(BaseModel):
    model_config = ConfigDict(extra="forbid")

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class ProbabilityInterval(BaseModel):
    lower: float = Field(ge=0, le=1)
    point: float = Field(ge=0, le=1)
    upper: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def ordered(self) -> "ProbabilityInterval":
        if not self.lower <= self.point <= self.upper:
            raise ValueError("probability interval must be ordered")
        return self


class Driver(BaseModel):
    name: str
    value: float
    unit: str
    contribution: float = Field(ge=-1, le=1)


class Calibration(BaseModel):
    method: str
    brier_score: float = Field(ge=0, le=1)
    expected_calibration_error: float = Field(ge=0, le=1)


class IgnitionRiskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location: Coordinates
    horizon: Horizon = Horizon.H24
    valid_at: datetime | None = None
    vegetation_dryness: float = Field(default=0.72, ge=0, le=1)
    wind_speed_kph: float = Field(default=32, ge=0, le=250)
    soil_moisture: float = Field(default=0.18, ge=0, le=1)

    @field_validator("valid_at")
    @classmethod
    def valid_at_must_be_timezone_aware(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("valid_at must include a timezone")
        return value


class IgnitionRiskResponse(BaseModel):
    cell_id: str
    horizon: Horizon
    probability: ProbabilityInterval
    drivers: list[Driver]
    calibration: Calibration
    generated_at: datetime
    provenance: str


class AssetExposure(BaseModel):
    settlements: int = Field(ge=0)
    roads_km: float = Field(ge=0)
    power_lines_km: float = Field(ge=0)
    forest_hectares: float = Field(ge=0)
    protected_area_hectares: float = Field(ge=0)


class GeoPoint(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class SpreadForecastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(
        default="evros-2023",
        min_length=1,
        max_length=80,
        pattern=r"^[a-z0-9-]+$",
    )
    origin: Coordinates = Coordinates(latitude=40.93, longitude=25.86)
    forecast_hours: int = Field(default=24, ge=1, le=168)
    wind_speed_kph: float = Field(default=33, ge=0, le=250)
    wind_direction_degrees: float = Field(default=86, ge=0, lt=360)
    fuel_dryness: float = Field(default=0.78, ge=0, le=1)
    slope_degrees: float = Field(default=8, ge=0, le=70)


class SpreadForecastResponse(BaseModel):
    event_id: str
    forecast_hours: int = Field(ge=1, le=168)
    expected_area_hectares: float = Field(ge=0)
    probable_direction_degrees: float = Field(ge=0, lt=360)
    arrival_time_p10_hours: float = Field(ge=0)
    arrival_time_p50_hours: float = Field(ge=0)
    arrival_time_p90_hours: float = Field(ge=0)
    uncertainty_coverage: float = Field(ge=0, le=1)
    perimeter_p50: list[GeoPoint]
    perimeter_p90: list[GeoPoint]
    affected_assets: AssetExposure
    model_version: str
    caveat: str

    @model_validator(mode="after")
    def ordered_arrival_times(self) -> "SpreadForecastResponse":
        if not (
            self.arrival_time_p10_hours
            <= self.arrival_time_p50_hours
            <= self.arrival_time_p90_hours
        ):
            raise ValueError("arrival-time quantiles must be ordered")
        return self


class VerificationMetrics(BaseModel):
    event_id: str
    forecast_hour: int
    intersection_over_union: float = Field(ge=0, le=1)
    boundary_distance_km: float = Field(ge=0)
    arrival_time_error_minutes: int = Field(ge=0)
    uncertainty_coverage: float = Field(ge=0, le=1)
    observed_detections: int = Field(ge=0)


class StoryEvent(BaseModel):
    id: str
    name: str
    country: str
    started_at: datetime
    focus: Coordinates
    narrative: str
    data_mode: str
    source_url: str
