import type { ExposureSummary, Horizon, RiskInterval, StoryFrame } from "./contracts";

export const STORY_FRAMES: StoryFrame[] = [
  { hour: 0, label: "19 Aug · 06:00", riskLow: 0.18, riskHigh: 0.27, areaHectares: 420, frontKm: 3.2, windKph: 28, windDirection: "NE", iou: 0.71, arrivalErrorMinutes: 94, observationCount: 12, containment: 0, temperatureC: 34.2, soilMoisture: 0.18 },
  { hour: 6, label: "19 Aug · 12:00", riskLow: 0.31, riskHigh: 0.44, areaHectares: 3180, frontKm: 9.8, windKph: 36, windDirection: "ENE", iou: 0.76, arrivalErrorMinutes: 78, observationCount: 31, containment: 0, temperatureC: 38.1, soilMoisture: 0.15 },
  { hour: 12, label: "19 Aug · 18:00", riskLow: 0.42, riskHigh: 0.58, areaHectares: 8750, frontKm: 17.4, windKph: 41, windDirection: "E", iou: 0.81, arrivalErrorMinutes: 61, observationCount: 58, containment: 2, temperatureC: 36.8, soilMoisture: 0.13 },
  { hour: 18, label: "20 Aug · 00:00", riskLow: 0.36, riskHigh: 0.49, areaHectares: 15620, frontKm: 25.1, windKph: 33, windDirection: "ESE", iou: 0.84, arrivalErrorMinutes: 49, observationCount: 77, containment: 4, temperatureC: 29.4, soilMoisture: 0.14 },
  { hour: 24, label: "20 Aug · 06:00", riskLow: 0.29, riskHigh: 0.39, areaHectares: 24380, frontKm: 33.7, windKph: 30, windDirection: "SE", iou: 0.86, arrivalErrorMinutes: 42, observationCount: 103, containment: 6, temperatureC: 31.1, soilMoisture: 0.16 },
  { hour: 30, label: "20 Aug · 12:00", riskLow: 0.22, riskHigh: 0.33, areaHectares: 36790, frontKm: 44.9, windKph: 25, windDirection: "SE", iou: 0.88, arrivalErrorMinutes: 36, observationCount: 141, containment: 9, temperatureC: 35.3, soilMoisture: 0.17 },
];

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
