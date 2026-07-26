import type { HistoricIncident, SourceManifest, StoryFrame } from "./contracts";

/*
 * These compact replay artifacts are intentionally checked into the repository.
 * Locations, activation identifiers, publishers, and selected Evros monitoring
 * statistics come from the cited public products. The normalized six-step
 * forecast metrics are illustrative research fixtures rather than emergency
 * products or digitized official perimeter geometry.
 */

const makeFrames = (
  area: number[],
  detections: number[],
  wind: number[],
  temperature: number[],
  labels: string[],
): StoryFrame[] =>
  area.map((areaHectares, index) => ({
    hour: index * 6,
    label: labels[index],
    riskLow: [0.18, 0.31, 0.42, 0.36, 0.29, 0.22][index],
    riskHigh: [0.27, 0.44, 0.58, 0.49, 0.39, 0.33][index],
    areaHectares,
    frontKm: Math.sqrt(areaHectares) * 0.47,
    windKph: wind[index],
    windDirection: ["NE", "ENE", "E", "ESE", "SE", "SSE"][index],
    iou: 0.69 + index * 0.035,
    arrivalErrorMinutes: 102 - index * 12,
    observationCount: detections[index],
    containment: Math.min(38, index * 6),
    temperatureC: temperature[index],
    soilMoisture: 0.13 + index * 0.008,
  }));

export const SOURCE_MANIFESTS: SourceManifest[] = [
  {
    id: "cems-emsr686",
    publisher: "Copernicus Emergency Management Service",
    title: "EMSR686 — Forest fires in Greece",
    url: "https://rapidmapping.emergency.copernicus.eu/EMSR686/",
    license: "Copernicus data policy; attribution required",
    accessed: "2026-07-26",
    note:
      "Activation and monitoring-product provenance. The app uses a compact research replay, not authoritative response geometry.",
  },
  {
    id: "cems-emsr715",
    publisher: "Copernicus Emergency Management Service",
    title: "EMSR715 — Wildfire in Valparaíso Region, Chile",
    url: "https://mapping.emergency.copernicus.eu/news/wildfire-in-valparaiso-region-chile/",
    license: "Copernicus data policy; attribution required",
    accessed: "2026-07-26",
    note:
      "Historic activation context. Display geometry is a clearly labeled normalized replay fixture.",
  },
  {
    id: "cems-emsr500",
    publisher: "Copernicus Emergency Management Service",
    title: "EMSR500 — Wildfires in Western Australia",
    url: "https://mapping.emergency.copernicus.eu/activations/EMSR500/",
    license: "Copernicus data policy; attribution required",
    accessed: "2026-07-26",
    note:
      "Historic activation context. Display geometry is a clearly labeled normalized replay fixture.",
  },
  {
    id: "natural-earth",
    publisher: "Natural Earth",
    title: "Admin 0 country boundaries, 1:110m",
    url: "https://www.naturalearthdata.com/about/terms-of-use/",
    license: "Public domain",
    accessed: "2026-07-26",
    note: "Geographic context only.",
  },
  {
    id: "nasa-firms",
    publisher: "NASA FIRMS",
    title: "MODIS and VIIRS active fire data",
    url: "https://firms.modaps.eosdis.nasa.gov/active_fire/",
    license: "NASA Earth observation data; attribution requested",
    accessed: "2026-07-26",
    note:
      "The interface demonstrates a VIIRS-shaped detection contract. It does not request or present a live FIRMS feed.",
  },
  {
    id: "era5-land",
    publisher: "Copernicus Climate Change Service",
    title: "ERA5-Land hourly data",
    url: "https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land",
    license: "CC BY 4.0",
    accessed: "2026-07-26",
    note: "Weather fields in this repository are deterministic research fixtures.",
  },
];

export const HISTORIC_INCIDENTS: HistoricIncident[] = [
  {
    id: "evros-2023",
    name: "Evros",
    region: "Alexandroupolis",
    country: "Greece",
    year: 2023,
    latitude: 40.93,
    longitude: 25.86,
    activationCode: "EMSR686",
    status: "historic-replay",
    summary:
      "CEMS documented rapid growth in the Evros complex. Monitoring 01 reported 8,529.4 ha; Monitoring 02 reported 72,344.5 ha.",
    sourceIds: ["cems-emsr686", "natural-earth", "nasa-firms", "era5-land"],
    assetFixture: {
      label: "Evros corridor fixture",
      corridor: [
        { latitude: 40.63, longitude: 25.45 },
        { latitude: 40.78, longitude: 25.61 },
        { latitude: 40.93, longitude: 25.86 },
        { latitude: 41.08, longitude: 26.05 },
      ],
      criticalSites: [
        { latitude: 40.85, longitude: 25.77 },
        { latitude: 40.97, longitude: 25.91 },
        { latitude: 41.03, longitude: 25.98 },
      ],
      caveat:
        "Synthetic corridor and site geometry for interaction testing; not an authoritative asset inventory.",
    },
    frames: makeFrames(
      [8529.4, 28640, 72344.5, 76810, 83420, 93880],
      [34, 48, 40, 56, 44, 29],
      [28, 36, 41, 33, 30, 25],
      [34.2, 38.1, 36.8, 29.4, 31.1, 35.3],
      [
        "21 Aug · 09:25",
        "22 Aug · 12:00",
        "23 Aug · 09:30",
        "25 Aug · 10:00",
        "26 Aug · 10:00",
        "02 Sep · 10:00",
      ],
    ),
  },
  {
    id: "valparaiso-2024",
    name: "Valparaíso",
    region: "Viña del Mar",
    country: "Chile",
    year: 2024,
    latitude: -33.05,
    longitude: -71.47,
    activationCode: "EMSR715",
    status: "historic-replay",
    summary:
      "A historic CEMS activation centered on the February 2024 Valparaíso Region wildfire emergency.",
    sourceIds: ["cems-emsr715", "natural-earth", "nasa-firms", "era5-land"],
    assetFixture: {
      label: "Valparaíso corridor fixture",
      corridor: [
        { latitude: -33.16, longitude: -71.61 },
        { latitude: -33.1, longitude: -71.55 },
        { latitude: -33.05, longitude: -71.47 },
        { latitude: -32.99, longitude: -71.39 },
      ],
      criticalSites: [
        { latitude: -33.08, longitude: -71.51 },
        { latitude: -33.02, longitude: -71.44 },
        { latitude: -32.97, longitude: -71.38 },
      ],
      caveat:
        "Synthetic corridor and site geometry for interaction testing; not an authoritative asset inventory.",
    },
    frames: makeFrames(
      [780, 2140, 4360, 6220, 7440, 8610],
      [18, 39, 71, 83, 62, 45],
      [22, 31, 38, 34, 27, 20],
      [28.4, 31.7, 33.2, 30.8, 27.9, 26.1],
      [
        "02 Feb · 18:00",
        "03 Feb · 00:00",
        "03 Feb · 06:00",
        "03 Feb · 12:00",
        "03 Feb · 18:00",
        "04 Feb · 00:00",
      ],
    ),
  },
  {
    id: "perth-hills-2021",
    name: "Wooroloo",
    region: "Perth Hills",
    country: "Australia",
    year: 2021,
    latitude: -31.8,
    longitude: 116.32,
    activationCode: "EMSR500",
    status: "historic-replay",
    summary:
      "A historic CEMS activation for the February 2021 Western Australia wildfires near the Perth Hills.",
    sourceIds: ["cems-emsr500", "natural-earth", "nasa-firms", "era5-land"],
    assetFixture: {
      label: "Perth Hills corridor fixture",
      corridor: [
        { latitude: -31.93, longitude: 116.18 },
        { latitude: -31.86, longitude: 116.25 },
        { latitude: -31.8, longitude: 116.32 },
        { latitude: -31.72, longitude: 116.42 },
      ],
      criticalSites: [
        { latitude: -31.87, longitude: 116.27 },
        { latitude: -31.78, longitude: 116.35 },
        { latitude: -31.73, longitude: 116.41 },
      ],
      caveat:
        "Synthetic corridor and site geometry for interaction testing; not an authoritative asset inventory.",
    },
    frames: makeFrames(
      [540, 1880, 3460, 5660, 8200, 10500],
      [15, 29, 47, 66, 58, 38],
      [26, 35, 43, 39, 31, 24],
      [36.3, 39.4, 40.1, 37.8, 34.1, 31.8],
      [
        "01 Feb · 06:00",
        "01 Feb · 12:00",
        "01 Feb · 18:00",
        "02 Feb · 00:00",
        "02 Feb · 06:00",
        "02 Feb · 12:00",
      ],
    ),
  },
];

export const DEFAULT_INCIDENT = HISTORIC_INCIDENTS[0];

export function sourcesForIncident(incident: HistoricIncident) {
  return SOURCE_MANIFESTS.filter((source) => incident.sourceIds.includes(source.id));
}
