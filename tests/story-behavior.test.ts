import assert from "node:assert/strict";
import test from "node:test";

import {
  exposureFor,
  riskIntervalFor,
  STORY_FRAMES,
} from "../lib/story.ts";
import type { Horizon } from "../lib/contracts.ts";

const horizons: Horizon[] = ["6h", "24h", "48h", "72h", "7d"];

test("every replay frame has ordered, bounded, horizon-sensitive risk", () => {
  for (const frame of STORY_FRAMES) {
    const intervals = horizons.map((horizon) => riskIntervalFor(frame, horizon));
    const points = intervals.map((interval) => interval.point);

    assert.deepEqual(points, [...points].sort((left, right) => left - right));
    assert.equal(new Set(points).size, horizons.length);
    for (const interval of intervals) {
      assert.ok(0 <= interval.lower);
      assert.ok(interval.lower <= interval.point);
      assert.ok(interval.point <= interval.upper);
      assert.ok(interval.upper <= 1);
    }
  }
});

test("exposure summaries cover every requested asset class and increase with spread", () => {
  const first = exposureFor(STORY_FRAMES[0]);
  const last = exposureFor(STORY_FRAMES.at(-1)!);

  assert.ok(last.settlements >= first.settlements);
  assert.ok(last.people > first.people);
  assert.ok(last.roadsKm > first.roadsKm);
  assert.ok(last.powerLinesKm > first.powerLinesKm);
  assert.ok(last.forestHectares > first.forestHectares);
  assert.ok(last.protectedAreaHectares > first.protectedAreaHectares);
});

test("story replay is chronologically ordered and verification improves", () => {
  const hours = STORY_FRAMES.map((frame) => frame.hour);
  const iou = STORY_FRAMES.map((frame) => frame.iou);
  const errors = STORY_FRAMES.map((frame) => frame.arrivalErrorMinutes);

  assert.deepEqual(hours, [...hours].sort((left, right) => left - right));
  assert.deepEqual(iou, [...iou].sort((left, right) => left - right));
  assert.deepEqual(errors, [...errors].sort((left, right) => right - left));
});
