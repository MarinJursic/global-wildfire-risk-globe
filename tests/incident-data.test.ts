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
      assert.match(source.note.toLowerCase(), /fixture|context|live|geometry/);
    }
  }
});
