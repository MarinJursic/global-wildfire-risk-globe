import assert from "node:assert/strict";
import test from "node:test";

import {
  HISTORIC_INCIDENTS,
  SOURCE_MANIFESTS,
  sourcesForIncident,
} from "../lib/incidents.ts";

test("bundles three geographically distinct, explicitly historic examples", () => {
  assert.equal(HISTORIC_INCIDENTS.length, 3);
  assert.equal(
    new Set(HISTORIC_INCIDENTS.map((incident) => incident.country)).size,
    3,
  );
  for (const incident of HISTORIC_INCIDENTS) {
    assert.equal(incident.status, "historic-replay");
    assert.ok(incident.latitude >= -90 && incident.latitude <= 90);
    assert.ok(incident.longitude >= -180 && incident.longitude <= 180);
    assert.match(incident.activationCode, /^EMSR\d+$/);
  }
});

test("keeps every replay chronological and bounded", () => {
  for (const incident of HISTORIC_INCIDENTS) {
    assert.equal(incident.frames.length, 6);
    const hours = incident.frames.map((frame) => frame.hour);
    assert.deepEqual(hours, [...hours].sort((left, right) => left - right));
    for (const frame of incident.frames) {
      assert.ok(frame.areaHectares > 0);
      assert.ok(frame.riskLow >= 0);
      assert.ok(frame.riskHigh <= 1);
      assert.ok(frame.riskLow < frame.riskHigh);
    }
  }
});

test("every incident owns distinct, bounded asset-at-risk fixture geometry", () => {
  const signatures = new Set<string>();
  for (const incident of HISTORIC_INCIDENTS) {
    assert.ok(incident.assetFixture.corridor.length >= 3);
    assert.ok(incident.assetFixture.criticalSites.length >= 1);
    assert.match(
      incident.assetFixture.caveat.toLowerCase(),
      /synthetic|not authoritative/,
    );
    const points = [
      ...incident.assetFixture.corridor,
      ...incident.assetFixture.criticalSites,
    ];
    for (const point of points) {
      assert.ok(point.latitude >= -90 && point.latitude <= 90);
      assert.ok(point.longitude >= -180 && point.longitude <= 180);
    }
    signatures.add(JSON.stringify(incident.assetFixture));
  }
  assert.equal(signatures.size, HISTORIC_INCIDENTS.length);
});

test("resolves all source identifiers to attributable manifests", () => {
  assert.ok(SOURCE_MANIFESTS.length >= 6);
  for (const incident of HISTORIC_INCIDENTS) {
    const sources = sourcesForIncident(incident);
    assert.equal(sources.length, incident.sourceIds.length);
    for (const source of sources) {
      assert.match(source.url, /^https:\/\//);
      assert.ok(source.publisher.length > 3);
      assert.ok(source.license.length > 3);
      assert.match(
        source.note.toLowerCase(),
        /product|value|context|live|geometry|perimeter|point|flame|front/,
      );
    }
  }
});

test("bundles provenance-backed historic geometry and meteorology", () => {
  for (const incident of HISTORIC_INCIDENTS) {
    const { evidence } = incident;
    assert.ok(evidence.productLabel.startsWith("CEMS EMSR"));
    assert.ok(evidence.areaHectares > 1000);
    assert.ok(evidence.perimeterRings.length >= 1);
    assert.ok(evidence.evidencePoints.length >= 16);
    assert.ok(evidence.displayMagnification >= 1);
    assert.match(evidence.geometryMethod, /CEMS|official/i);

    for (const ring of evidence.perimeterRings) {
      assert.ok(ring.length >= 20);
      assert.deepEqual(ring[0], ring.at(-1));
      for (const point of ring) {
        assert.ok(point.latitude >= -90 && point.latitude <= 90);
        assert.ok(point.longitude >= -180 && point.longitude <= 180);
      }
    }

    assert.ok(evidence.weather.temperatureC > -60);
    assert.ok(evidence.weather.temperatureC < 60);
    assert.ok(evidence.weather.windSpeedMps >= 0);
    assert.ok(evidence.weather.windFromDegrees >= 0);
    assert.ok(evidence.weather.windFromDegrees < 360);
    assert.ok(evidence.weather.surfaceSoilWetness >= 0);
    assert.ok(evidence.weather.surfaceSoilWetness <= 1);
    assert.match(evidence.weather.sourceLabel, /NASA POWER.*MERRA-2/i);
  }
});

test("Evros keeps all mapped active flames and official fire-front evidence", () => {
  const evros = HISTORIC_INCIDENTS.find((item) => item.id === "evros-2023");
  assert.ok(evros);
  assert.equal(evros.evidence.evidencePoints.length, 40);
  assert.equal(evros.evidence.fireFrontKm, 13.6);
  assert.ok(evros.evidence.fireFronts.length >= 3);
  assert.ok(
    evros.sourceIds.includes("cems-emsr686-monitoring02"),
  );
});
