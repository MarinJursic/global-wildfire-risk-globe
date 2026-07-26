import assert from "node:assert/strict";
import test from "node:test";

import type { LayerKey } from "../lib/contracts.ts";
import { globeLayerState } from "../lib/layer-state.ts";

const keys: LayerKey[] = [
  "wind",
  "temperature",
  "moisture",
  "dryness",
  "detections",
  "uncertainty",
  "scars",
  "infrastructure",
];

test("every layer control maps to its own renderer visibility flag", () => {
  for (const key of keys) {
    const layers = Object.fromEntries(
      keys.map((candidate) => [candidate, candidate !== key]),
    ) as Record<LayerKey, boolean>;
    const visibility = globeLayerState(layers);

    assert.equal(visibility[key], false);
    for (const other of keys.filter((candidate) => candidate !== key)) {
      assert.equal(visibility[other], true);
    }
  }
});
