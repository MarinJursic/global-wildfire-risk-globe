import type { HistoricIncident, SourceManifest, StoryFrame } from "./contracts";
import { HISTORIC_EVIDENCE } from "./historic-evidence.ts";

/*
 * These compact replay artifacts are intentionally checked into the repository.
 * Locations, activation identifiers, mapped areas, sampled perimeter geometry,
 * and selected evidence points come from the cited public products. The
 * normalized six-step forecast metrics remain illustrative research fixtures.
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
    url: "https://rapidmapping.emergency.copernicus.eu/backend/EMSR686/AOI01/DEL_MONIT08/EMSR686_AOI01_DEL_MONIT08_v1.zip",
    license: "Copernicus data policy; attribution required",
    accessed: "2026-07-26",
    note:
      "Monitoring 08 vector package. The bundled perimeter is an equal-distance sample of its official burnt-area polygon exterior (93,511.0 ha).",
  },
  {
    id: "cems-emsr686-monitoring02",
    publisher: "Copernicus Emergency Management Service",
    title: "EMSR686 — Monitoring 02 fire fronts and active flames",
    url: "https://rapidmapping.emergency.copernicus.eu/backend/EMSR686/AOI01/DEL_MONIT02/EMSR686_AOI01_DEL_MONIT02_v3.zip",
    license: "Copernicus data policy; attribution required",
    accessed: "2026-07-26",
    note:
      "Monitoring 02 vector package. The bundle preserves all 40 photo-interpreted active-flame coordinates and compact samples of official fire-front lines.",
  },
  {
    id: "cems-emsr715",
    publisher: "Copernicus Emergency Management Service",
    title: "EMSR715 — Wildfire in Valparaíso Region, Chile",
    url: "https://rapidmapping.emergency.copernicus.eu/backend/EMSR715/AOI01/DEL_PRODUCT/EMSR715_AOI01_DEL_PRODUCT_v2.zip",
    license: "Copernicus data policy; attribution required",
    accessed: "2026-07-26",
    note:
      "AOI01 delineation vector package. Bundled geometry samples the two largest official burnt-area polygons; the mapped total is 8,718.2 ha.",
  },
  {
    id: "cems-emsr500",
    publisher: "Copernicus Emergency Management Service",
    title: "EMSR500 — Wildfires in Western Australia",
    url: "https://cems-mapping-website.s3.eu-west-1.amazonaws.com/static/activations/EMSR500/EMSR500_AOI01_DEL_MONIT01_r1_RTP01_v1_vector.zip",
    license: "Copernicus data policy; attribution required",
    accessed: "2026-07-26",
    note:
      "Monitoring 01 vector package. Bundled geometry samples the official largest burnt-area polygon; the product total is 10,671.8 ha.",
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
    id: "nasa-power-evros",
    publisher: "NASA POWER",
    title: "Evros daily UTC meteorology — 23 Aug 2023",
    url: "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M%2CWS10M%2CWD10M%2CGWETTOP&community=AG&longitude=25.86&latitude=40.93&start=20230823&end=20230823&format=JSON&time-standard=UTC",
    license: "NASA open data; attribution requested",
    accessed: "2026-07-26",
    note:
      "Bundled NASA POWER/MERRA-2 point values: 30.49 °C, 5.55 m/s 10 m wind from 050.2°, and 0.22 surface-soil-wetness fraction.",
  },
  {
    id: "nasa-power-valparaiso",
    publisher: "NASA POWER",
    title: "Valparaíso daily UTC meteorology — 05 Feb 2024",
    url: "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M%2CWS10M%2CWD10M%2CGWETTOP&community=AG&longitude=-71.47&latitude=-33.05&start=20240205&end=20240205&format=JSON&time-standard=UTC",
    license: "NASA open data; attribution requested",
    accessed: "2026-07-26",
    note:
      "Bundled NASA POWER/MERRA-2 point values: 22.34 °C, 3.18 m/s 10 m wind from 221.8°, and 0.19 surface-soil-wetness fraction.",
  },
  {
    id: "nasa-power-wooroloo",
    publisher: "NASA POWER",
    title: "Wooroloo daily UTC meteorology — 02 Feb 2021",
    url: "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M%2CWS10M%2CWD10M%2CGWETTOP&community=AG&longitude=116.32&latitude=-31.8&start=20210202&end=20210202&format=JSON&time-standard=UTC",
    license: "NASA open data; attribution requested",
    accessed: "2026-07-26",
    note:
      "Bundled NASA POWER/MERRA-2 point values: 26.89 °C, 2.86 m/s 10 m wind from 057.5°, and 0.13 surface-soil-wetness fraction.",
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
    sourceIds: [
      "cems-emsr686",
      "cems-emsr686-monitoring02",
      "natural-earth",
      "nasa-power-evros",
    ],
    evidence: HISTORIC_EVIDENCE["evros-2023"],
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
    sourceIds: [
      "cems-emsr715",
      "natural-earth",
      "nasa-power-valparaiso",
    ],
    evidence: HISTORIC_EVIDENCE["valparaiso-2024"],
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
    sourceIds: [
      "cems-emsr500",
      "natural-earth",
      "nasa-power-wooroloo",
    ],
    evidence: HISTORIC_EVIDENCE["perth-hills-2021"],
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
