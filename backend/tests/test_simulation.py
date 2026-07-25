from app.models import Coordinates, IgnitionRiskRequest, SpreadForecastRequest
from app.simulation import ignition_risk, spread_forecast


def test_wetter_soil_reduces_risk() -> None:
    dry = ignition_risk(
        IgnitionRiskRequest(
            location=Coordinates(latitude=40.93, longitude=25.86),
            vegetation_dryness=0.8,
            soil_moisture=0.1,
        )
    )
    wet = ignition_risk(
        IgnitionRiskRequest(
            location=Coordinates(latitude=40.93, longitude=25.86),
            vegetation_dryness=0.8,
            soil_moisture=0.8,
        )
    )
    assert dry.probability.point > wet.probability.point
    contributions = {driver.name: driver.contribution for driver in wet.drivers}
    assert contributions["vegetation_dryness"] > 0
    assert contributions["wind_speed"] > 0
    assert contributions["soil_moisture"] < 0


def test_longer_forecast_expands_expected_area() -> None:
    short = spread_forecast(SpreadForecastRequest(forecast_hours=6))
    long = spread_forecast(SpreadForecastRequest(forecast_hours=48))
    assert long.expected_area_hectares > short.expected_area_hectares
    assert long.affected_assets.roads_km > short.affected_assets.roads_km


def test_spread_geometry_remains_valid_at_poles_and_date_line() -> None:
    for origin in [
        Coordinates(latitude=90, longitude=180),
        Coordinates(latitude=-90, longitude=-180),
    ]:
        forecast = spread_forecast(
            SpreadForecastRequest(origin=origin, forecast_hours=168)
        )
        assert forecast.perimeter_p50[0] == forecast.perimeter_p50[-1]
        assert all(-90 <= point.latitude <= 90 for point in forecast.perimeter_p90)
        assert all(-180 <= point.longitude <= 180 for point in forecast.perimeter_p90)


def test_spread_exposure_and_uncertainty_expand_with_horizon() -> None:
    short = spread_forecast(SpreadForecastRequest(forecast_hours=6))
    long = spread_forecast(SpreadForecastRequest(forecast_hours=72))

    assert long.affected_assets.settlements >= short.affected_assets.settlements
    assert long.affected_assets.power_lines_km > short.affected_assets.power_lines_km
    assert long.affected_assets.forest_hectares > short.affected_assets.forest_hectares
    assert (
        long.affected_assets.protected_area_hectares
        > short.affected_assets.protected_area_hectares
    )

    short_p50_span = max(point.latitude for point in short.perimeter_p50) - min(
        point.latitude for point in short.perimeter_p50
    )
    short_p90_span = max(point.latitude for point in short.perimeter_p90) - min(
        point.latitude for point in short.perimeter_p90
    )
    assert short_p90_span > short_p50_span
