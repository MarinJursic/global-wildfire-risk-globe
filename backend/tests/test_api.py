from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_and_story_event() -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["mode"] == "deterministic-story"

    events = client.get("/v1/events")
    assert events.status_code == 200
    assert events.json()[0]["id"] == "evros-2023"
    assert events.json()[0]["data_mode"] == "cached-contract-plus-simulation"


def test_ignition_risk_is_deterministic_and_ordered() -> None:
    payload = {
        "location": {"latitude": 40.93, "longitude": 25.86},
        "horizon": "24h",
        "vegetation_dryness": 0.78,
        "wind_speed_kph": 33,
        "soil_moisture": 0.16,
    }
    first = client.post("/v1/ignition-risk", json=payload)
    second = client.post("/v1/ignition-risk", json=payload)
    assert first.status_code == 200
    assert first.json()["probability"] == second.json()["probability"]
    interval = first.json()["probability"]
    assert 0 <= interval["lower"] <= interval["point"] <= interval["upper"] <= 1
    assert first.json()["calibration"]["expected_calibration_error"] == 0.031
    assert first.json() == second.json()
    assert first.json()["generated_at"] == "2023-08-19T06:00:00Z"


def test_horizon_increases_ignition_probability() -> None:
    payload = {
        "location": {"latitude": 40.93, "longitude": 25.86},
        "vegetation_dryness": 0.78,
        "wind_speed_kph": 33,
        "soil_moisture": 0.16,
    }
    probabilities = [
        client.post("/v1/ignition-risk", json={**payload, "horizon": horizon})
        .json()["probability"]["point"]
        for horizon in ["6h", "24h", "48h", "72h", "7d"]
    ]
    assert probabilities == sorted(probabilities)
    assert len(set(probabilities)) == 5


def test_spread_perimeters_are_closed_and_p90_is_larger() -> None:
    response = client.post(
        "/v1/spread-forecast",
        json={
            "event_id": "evros-2023",
            "forecast_hours": 24,
            "wind_speed_kph": 33,
            "wind_direction_degrees": 86,
            "fuel_dryness": 0.78,
            "slope_degrees": 8,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["perimeter_p50"][0] == data["perimeter_p50"][-1]
    assert data["perimeter_p90"][0] == data["perimeter_p90"][-1]
    assert len(data["perimeter_p50"]) == 37
    assert data["expected_area_hectares"] > 0
    assert data["uncertainty_coverage"] == 0.9
    assert (
        data["arrival_time_p10_hours"]
        < data["arrival_time_p50_hours"]
        < data["arrival_time_p90_hours"]
    )
    assert data["affected_assets"]["forest_hectares"] > 0


def test_spread_rejects_unknown_story_event() -> None:
    response = client.post(
        "/v1/spread-forecast",
        json={"event_id": "fabricated-event", "forecast_hours": 24},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Unknown story event"


def test_validation_rejects_impossible_coordinates() -> None:
    response = client.post(
        "/v1/ignition-risk",
        json={"location": {"latitude": 122, "longitude": 25}, "horizon": "24h"},
    )
    assert response.status_code == 422


def test_validation_rejects_unknown_fields_and_naive_timestamp() -> None:
    extra = client.post(
        "/v1/ignition-risk",
        json={
            "location": {"latitude": 40.93, "longitude": 25.86, "altitude": 10},
            "horizon": "24h",
        },
    )
    naive_time = client.post(
        "/v1/ignition-risk",
        json={
            "location": {"latitude": 40.93, "longitude": 25.86},
            "valid_at": "2023-08-19T06:00:00",
        },
    )
    assert extra.status_code == 422
    assert naive_time.status_code == 422


def test_verification_metrics_improve_through_replay() -> None:
    early = client.get("/v1/verification/evros-2023?forecast_hour=0").json()
    late = client.get("/v1/verification/evros-2023?forecast_hour=72").json()
    assert late["intersection_over_union"] > early["intersection_over_union"]
    assert late["arrival_time_error_minutes"] < early["arrival_time_error_minutes"]
    assert late["observed_detections"] > early["observed_detections"]


def test_verification_rejects_unknown_event_and_preserves_requested_hour() -> None:
    missing = client.get("/v1/verification/not-a-real-event?forecast_hour=24")
    extended = client.get("/v1/verification/evros-2023?forecast_hour=168")
    invalid = client.get("/v1/verification/evros-2023?forecast_hour=169")

    assert missing.status_code == 404
    assert missing.json()["detail"] == "Unknown story event"
    assert extended.status_code == 200
    assert extended.json()["forecast_hour"] == 168
    assert invalid.status_code == 422


def test_unsupported_method_returns_405() -> None:
    response = client.put("/health")
    assert response.status_code == 405
