import { describe, expect, it } from "vitest";

import { countrySegments, toVector } from "../components/GlobeScene";

describe("globe geography", () => {
  it("maps cardinal WGS84 coordinates to the expected sphere axes", () => {
    const primeMeridian = toVector(0, 0, 1);
    const northPole = toVector(90, 0, 1);
    const east = toVector(0, 90, 1);

    expect(primeMeridian.toArray()).toEqual(
      expect.arrayContaining([expect.closeTo(1, 8), expect.closeTo(0, 8), expect.closeTo(0, 8)]),
    );
    expect(northPole.y).toBeCloseTo(1, 8);
    expect(east.z).toBeCloseTo(-1, 8);
  });

  it("builds a detailed, surface-aligned Natural Earth boundary layer", () => {
    const segments = countrySegments();

    expect(segments.length).toBeGreaterThan(10_000);
    expect(segments.length % 2).toBe(0);
    for (const point of segments) {
      expect(point.length()).toBeCloseTo(1.738, 8);
    }

    // A date-line chord would be nearly a globe diameter. Every emitted segment
    // should instead stay local at Natural Earth's 1:110m generalization.
    for (let index = 0; index < segments.length; index += 2) {
      expect(segments[index].distanceTo(segments[index + 1])).toBeLessThan(0.65);
    }
  });

  it("places Evros in the northern and eastern hemispheres", () => {
    const evros = toVector(40.93, 25.86, 1.78);

    expect(evros.y).toBeGreaterThan(0);
    expect(evros.z).toBeLessThan(0);
    expect(evros.length()).toBeCloseTo(1.78, 8);
  });
});
