import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import {
  applyArcballDelta,
  clampCameraDistance,
  decayVelocity,
  focusQuaternion,
  MAX_CAMERA_DISTANCE,
  MIN_CAMERA_DISTANCE,
  shouldApplyInertia,
} from "../components/globe/ArcballController.ts";

test("arcball applies independent horizontal and vertical quaternion rotation", () => {
  const start = new THREE.Quaternion();
  const horizontal = applyArcballDelta(start, 40, 0);
  const vertical = applyArcballDelta(start, 0, 40);

  assert.equal(horizontal.equals(start), false);
  assert.equal(vertical.equals(start), false);
  assert.equal(horizontal.equals(vertical), false);
  assert.ok(Math.abs(horizontal.length() - 1) < 1e-8);
  assert.ok(Math.abs(vertical.length() - 1) < 1e-8);
});

test("arcball crosses both poles without a polar clamp", () => {
  let orientation = new THREE.Quaternion();
  for (let index = 0; index < 220; index += 1) {
    orientation = applyArcballDelta(orientation, 0, 10);
  }
  const north = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);

  assert.ok(north.toArray().every(Number.isFinite));
  assert.ok(Math.abs(orientation.length() - 1) < 1e-8);
});

test("wheel and pinch distance clamps preserve useful full-Earth limits", () => {
  assert.equal(clampCameraDistance(-100), MIN_CAMERA_DISTANCE);
  assert.equal(clampCameraDistance(100), MAX_CAMERA_DISTANCE);
  assert.equal(clampCameraDistance(5), 5);
});

test("focus orientations support incidents in all hemispheres", () => {
  for (const [latitude, longitude] of [
    [40.93, 25.86],
    [-33.05, -71.47],
    [-31.8, 116.32],
  ]) {
    const orientation = focusQuaternion(latitude, longitude);
    assert.ok(Math.abs(orientation.length() - 1) < 1e-8);
  }
});

test("inertial velocity decays deterministically", () => {
  const velocity = new THREE.Vector2(20, -10);
  const firstLength = velocity.length();
  decayVelocity(velocity, 0.1);
  assert.ok(velocity.length() < firstLength);
  assert.ok(velocity.x > 0);
  assert.ok(velocity.y < 0);
});

test("reduced motion disables inertial continuation", () => {
  assert.equal(shouldApplyInertia(true, 0, 100), false);
  assert.equal(shouldApplyInertia(false, 1, 100), false);
  assert.equal(shouldApplyInertia(false, 0, 0.01), false);
  assert.equal(shouldApplyInertia(false, 0, 100), true);
});
