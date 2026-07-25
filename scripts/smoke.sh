#!/usr/bin/env bash
set -euo pipefail

api_url="${EMBER_API_URL:-http://127.0.0.1:8000}"
web_url="${EMBER_WEB_URL:-http://localhost:3000}"

curl --fail --silent "${api_url}/health" | grep -q '"status":"ok"'
curl --fail --silent "${api_url}/v1/events" | grep -q '"evros-2023"'
curl --fail --silent \
  -H 'Content-Type: application/json' \
  -d '{"location":{"latitude":40.93,"longitude":25.86},"horizon":"24h"}' \
  "${api_url}/v1/ignition-risk" | grep -q '"probability"'
curl --fail --silent \
  -H 'Content-Type: application/json' \
  -d '{"event_id":"evros-2023","forecast_hours":24}' \
  "${api_url}/v1/spread-forecast" |
  grep -q '"arrival_time_p10_hours".*"arrival_time_p50_hours".*"arrival_time_p90_hours".*"forest_hectares"'
unknown_spread_status="$(
  curl --silent --output /dev/null --write-out '%{http_code}' \
    -H 'Content-Type: application/json' \
    -d '{"event_id":"fabricated-event","forecast_hours":24}' \
    "${api_url}/v1/spread-forecast"
)"
test "${unknown_spread_status}" = "404"
curl --fail --silent \
  "${api_url}/v1/verification/evros-2023?forecast_hour=24" | grep -q '"intersection_over_union"'
unknown_status="$(
  curl --silent --output /dev/null --write-out '%{http_code}' \
    "${api_url}/v1/verification/not-a-real-event?forecast_hour=24"
)"
test "${unknown_status}" = "404"
curl --fail --silent "${web_url}/" | grep -q 'Global wildfire intelligence'

echo "Smoke test passed: frontend and API contracts are reachable."
