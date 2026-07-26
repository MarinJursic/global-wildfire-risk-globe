export type Horizon = "6h" | "24h" | "48h" | "72h" | "7d";
export type LayerKey =
  | "wind"
  | "temperature"
  | "moisture"
  | "dryness"
  | "detections"
  | "uncertainty"
  | "scars"
  | "infrastructure";

export interface StoryFrame {
  hour: number;
  label: string;
  riskLow: number;
  riskHigh: number;
  areaHectares: number;
  frontKm: number;
  windKph: number;
  windDirection: string;
  iou: number;
  arrivalErrorMinutes: number;
  observationCount: number;
  containment: number;
  temperatureC: number;
  soilMoisture: number;
}

export interface SourceManifest {
  id: string;
  publisher: string;
  title: string;
  url: string;
  license: string;
  accessed: string;
  note: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface HistoricEvidence {
  productLabel: string;
  mappedAtUtc: string;
  areaHectares: number;
  perimeterRings: GeoPoint[][];
  evidencePoints: GeoPoint[];
  evidencePointLabel: string;
  fireFronts: GeoPoint[][];
  fireFrontKm?: number;
  geometryMethod: string;
  displayMagnification: number;
  weather: {
    dateUtc: string;
    temperatureC: number;
    windSpeedMps: number;
    windFromDegrees: number;
    surfaceSoilWetness: number;
    sourceLabel: string;
  };
}

export interface HistoricIncident {
  id: string;
  name: string;
  region: string;
  country: string;
  year: number;
  latitude: number;
  longitude: number;
  activationCode: string;
  status: "historic-replay";
  summary: string;
  sourceIds: string[];
  evidence: HistoricEvidence;
  frames: StoryFrame[];
  assetFixture: {
    label: string;
    corridor: Array<{ latitude: number; longitude: number }>;
    criticalSites: Array<{ latitude: number; longitude: number }>;
    caveat: string;
  };
}

export type GlobeAction = "focus" | "fit" | "zoom-in" | "zoom-out" | "reset";

export interface GlobeCommand {
  id: number;
  action: GlobeAction;
}

export interface RiskInterval {
  lower: number;
  point: number;
  upper: number;
}

export interface ExposureSummary {
  settlements: number;
  people: number;
  roadsKm: number;
  powerLinesKm: number;
  forestHectares: number;
  protectedAreaHectares: number;
}

export interface IgnitionResponse {
  cell_id: string;
  horizon: Horizon;
  probability: { lower: number; point: number; upper: number };
  drivers: Array<{ name: string; value: number; unit: string; contribution: number }>;
  calibration: { method: string; brier_score: number; expected_calibration_error: number };
  generated_at: string;
  provenance: string;
}

export interface SpreadResponse {
  event_id: string;
  forecast_hours: number;
  expected_area_hectares: number;
  probable_direction_degrees: number;
  arrival_time_p10_hours: number;
  arrival_time_p50_hours: number;
  arrival_time_p90_hours: number;
  uncertainty_coverage: number;
  affected_assets: {
    settlements: number;
    roads_km: number;
    power_lines_km: number;
    forest_hectares: number;
    protected_area_hectares: number;
  };
}
