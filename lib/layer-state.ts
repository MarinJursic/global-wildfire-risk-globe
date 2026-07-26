import type { LayerKey } from "./contracts";

export type GlobeLayerState = Record<LayerKey, boolean>;

/**
 * Converts the UI control contract into renderer visibility flags.
 * Keeping this small mapping explicit makes unsupported or accidentally inert
 * controls detectable in tests.
 */
export function globeLayerState(layers: GlobeLayerState): GlobeLayerState {
  return {
    wind: layers.wind,
    temperature: layers.temperature,
    moisture: layers.moisture,
    dryness: layers.dryness,
    detections: layers.detections,
    uncertainty: layers.uncertainty,
    scars: layers.scars,
    infrastructure: layers.infrastructure,
  };
}
