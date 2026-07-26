import type { ExposureSummary, Horizon, RiskInterval, StoryFrame } from "./contracts";
import { DEFAULT_INCIDENT } from "./incidents.ts";

// Incident frames retain riskLow and arrivalErrorMinutes verification contracts.
export const STORY_FRAMES: StoryFrame[] = DEFAULT_INCIDENT.frames;

export const HORIZON_COPY: Record<Horizon, string> = {
  "6h": "Near-term",
  "24h": "Operational",
  "48h": "Planning",
  "72h": "Strategic",
  "7d": "Outlook",
};

export const LAYER_LABELS = {
  wind: "Wind field",
  temperature: "Temperature",
  moisture: "Soil moisture",
  dryness: "Vegetation dryness",
  detections: "VIIRS detections",
  uncertainty: "Forecast envelope",
  scars: "Historical fire scars",
  infrastructure: "Assets at risk",
} as const;

const HORIZON_HOURS: Record<Horizon, number> = {
  "6h": 6,
  "24h": 24,
  "48h": 48,
  "72h": 72,
  "7d": 168,
};

function cumulativeProbability(probability24h: number, horizon: Horizon) {
  return 1 - (1 - probability24h) ** (HORIZON_HOURS[horizon] / 24);
}

export function riskIntervalFor(frame: StoryFrame, horizon: Horizon): RiskInterval {
  const lower = cumulativeProbability(frame.riskLow, horizon);
  const upper = cumulativeProbability(frame.riskHigh, horizon);
  return {
    lower,
    point: (lower + upper) / 2,
    upper,
  };
}

export function exposureFor(frame: StoryFrame): ExposureSummary {
  const progress = frame.hour / STORY_FRAMES.at(-1)!.hour;
  return {
    settlements: 2 + Math.round(progress * 5),
    people: 1200 + Math.round(progress * 3700),
    roadsKm: 3.4 + progress * 10.5,
    powerLinesKm: 1.1 + progress * 4.8,
    forestHectares: Math.round(frame.areaHectares * 0.71),
    protectedAreaHectares: Math.round(frame.areaHectares * 0.36),
  };
}
