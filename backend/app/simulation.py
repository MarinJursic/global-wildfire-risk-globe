import hashlib
import math
from datetime import UTC, datetime

from .models import (
    AssetExposure,
    Calibration,
    Driver,
    GeoPoint,
    IgnitionRiskRequest,
    IgnitionRiskResponse,
    ProbabilityInterval,
    SpreadForecastRequest,
    SpreadForecastResponse,
    VerificationMetrics,
)

MODEL_VERSION = "ember-demo-0.4.2"
DEMO_GENERATED_AT = datetime(2023, 8, 19, 6, tzinfo=UTC)

HORIZON_HOURS = {
    "6h": 6,
    "24h": 24,
    "48h": 48,
    "72h": 72,
    "7d": 168,
}


def _stable_jitter(*values: object) -> float:
    payload = "|".join(str(value) for value in values).encode()
    digest = hashlib.sha256(payload).digest()
    return int.from_bytes(digest[:4], "big") / (2**32 - 1)


def ignition_risk(request: IgnitionRiskRequest) -> IgnitionRiskResponse:
    dry_signal = request.vegetation_dryness * 0.39
    wind_signal = min(request.wind_speed_kph / 70, 1) * 0.24
    moisture_signal = (1 - request.soil_moisture) * 0.23
    seasonal_prior = 0.08
    jitter = (_stable_jitter(
        round(request.location.latitude, 2),
        round(request.location.longitude, 2),
    ) - 0.5) * 0.035
    latent = (dry_signal + wind_signal + moisture_signal + seasonal_prior + jitter - 0.65) * 3.1
    point_24h = 1 / (1 + math.exp(-latent))
    horizon_days = HORIZON_HOURS[request.horizon.value] / 24
    point = min(0.995, 1 - (1 - point_24h) ** horizon_days)
    half_width = 0.035 + 0.065 * point

    return IgnitionRiskResponse(
        cell_id=f"cell-{request.location.latitude:+07.2f}-{request.location.longitude:+08.2f}",
        horizon=request.horizon,
        probability=ProbabilityInterval(
            lower=round(max(0, point - half_width), 4),
            point=round(point, 4),
            upper=round(min(1, point + half_width), 4),
        ),
        drivers=[
            Driver(
                name="vegetation_dryness",
                value=request.vegetation_dryness,
                unit="fraction",
                contribution=round(dry_signal, 4),
            ),
            Driver(
                name="wind_speed",
                value=request.wind_speed_kph,
                unit="km/h",
                contribution=round(wind_signal, 4),
            ),
            Driver(
                name="soil_moisture",
                value=request.soil_moisture,
                unit="fraction",
                contribution=round(-request.soil_moisture * 0.23, 4),
            ),
        ],
        calibration=Calibration(
            method="illustrative isotonic-contract metadata (not empirically fitted)",
            brier_score=0.087,
            expected_calibration_error=0.031,
        ),
        generated_at=request.valid_at or DEMO_GENERATED_AT,
        provenance=(
            "Deterministic synthetic estimate shaped like an operational contract; "
            "not a live alert and not derived from current satellite/weather feeds."
        ),
    )


def _ellipse_perimeter(
    origin_lat: float,
    origin_lon: float,
    major_km: float,
    minor_km: float,
    bearing_degrees: float,
) -> list[GeoPoint]:
    earth_radius_km = 6371.0088
    points: list[GeoPoint] = []
    rotation = math.radians(bearing_degrees)
    for step in range(36):
        theta = (step / 36) * 2 * math.pi
        x = major_km * math.cos(theta)
        y = minor_km * math.sin(theta)
        east = x * math.sin(rotation) + y * math.cos(rotation)
        north = x * math.cos(rotation) - y * math.sin(rotation)
        distance_km = math.hypot(east, north)
        bearing = math.atan2(east, north)
        angular_distance = distance_km / earth_radius_km
        origin_latitude = math.radians(origin_lat)
        origin_longitude = math.radians(origin_lon)
        latitude = math.asin(
            math.sin(origin_latitude) * math.cos(angular_distance)
            + math.cos(origin_latitude) * math.sin(angular_distance) * math.cos(bearing)
        )
        longitude = origin_longitude + math.atan2(
            math.sin(bearing) * math.sin(angular_distance) * math.cos(origin_latitude),
            math.cos(angular_distance) - math.sin(origin_latitude) * math.sin(latitude),
        )
        normalized_longitude = (math.degrees(longitude) + 540) % 360 - 180
        points.append(
            GeoPoint(
                latitude=round(math.degrees(latitude), 6),
                longitude=round(normalized_longitude, 6),
            )
        )
    points.append(points[0])
    return points


def spread_forecast(request: SpreadForecastRequest) -> SpreadForecastResponse:
    duration = request.forecast_hours
    wind_factor = 0.7 + request.wind_speed_kph / 40
    fuel_factor = 0.55 + request.fuel_dryness
    slope_factor = 1 + request.slope_degrees / 80
    major_km = 1.2 + duration * 0.31 * wind_factor * fuel_factor * slope_factor
    minor_km = 0.85 + duration * 0.13 * fuel_factor
    area_hectares = math.pi * major_km * minor_km * 100
    uncertainty = 1.24 + duration / 180
    arrival_p50 = max(0.5, duration * 0.42 / wind_factor)

    return SpreadForecastResponse(
        event_id=request.event_id,
        forecast_hours=duration,
        expected_area_hectares=round(area_hectares, 1),
        probable_direction_degrees=request.wind_direction_degrees,
        arrival_time_p10_hours=round(max(0.2, arrival_p50 * 0.72), 2),
        arrival_time_p50_hours=round(arrival_p50, 2),
        arrival_time_p90_hours=round(arrival_p50 * 1.48, 2),
        uncertainty_coverage=0.90,
        perimeter_p50=_ellipse_perimeter(
            request.origin.latitude,
            request.origin.longitude,
            major_km,
            minor_km,
            request.wind_direction_degrees,
        ),
        perimeter_p90=_ellipse_perimeter(
            request.origin.latitude,
            request.origin.longitude,
            major_km * uncertainty,
            minor_km * uncertainty,
            request.wind_direction_degrees,
        ),
        affected_assets=AssetExposure(
            settlements=max(1, round(area_hectares / 9000)),
            roads_km=round(major_km * 0.52, 1),
            power_lines_km=round(major_km * 0.19, 1),
            forest_hectares=round(area_hectares * 0.71, 1),
            protected_area_hectares=round(area_hectares * 0.36, 1),
        ),
        model_version=MODEL_VERSION,
        caveat=(
            "Research demonstration only. The ellipse-based simulator is deterministic "
            "and is not suitable for emergency response or operational forecasting."
        ),
    )


def verification(event_id: str, forecast_hour: int) -> VerificationMetrics:
    progress = min(forecast_hour / 72, 1)
    return VerificationMetrics(
        event_id=event_id,
        forecast_hour=forecast_hour,
        intersection_over_union=round(0.69 + 0.2 * (1 - math.exp(-progress * 3)), 3),
        boundary_distance_km=round(2.9 - 1.6 * progress, 2),
        arrival_time_error_minutes=round(96 - 61 * progress),
        uncertainty_coverage=round(0.86 + 0.05 * progress, 3),
        observed_detections=12 + round(176 * progress),
    )
