import * as THREE from "three";

export const MIN_CAMERA_DISTANCE = 3.15;
export const MAX_CAMERA_DISTANCE = 10.2;

export function clampCameraDistance(distance: number) {
  return THREE.MathUtils.clamp(distance, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE);
}

export function arcballDeltaQuaternion(
  deltaX: number,
  deltaY: number,
  sensitivity = 0.006,
) {
  const yaw = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    deltaX * sensitivity,
  );
  const pitch = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    deltaY * sensitivity,
  );
  return yaw.multiply(pitch).normalize();
}

export function applyArcballDelta(
  orientation: THREE.Quaternion,
  deltaX: number,
  deltaY: number,
  sensitivity = 0.006,
) {
  return arcballDeltaQuaternion(deltaX, deltaY, sensitivity)
    .multiply(orientation)
    .normalize();
}

export function decayVelocity(
  velocity: THREE.Vector2,
  deltaSeconds: number,
  damping = 8.5,
) {
  return velocity.multiplyScalar(Math.exp(-damping * deltaSeconds));
}

export function shouldApplyInertia(
  reducedMotion: boolean,
  pointerCount: number,
  velocitySquared: number,
) {
  return !reducedMotion && pointerCount === 0 && velocitySquared > 0.02;
}

export function focusQuaternion(latitude: number, longitude: number) {
  const phi = THREE.MathUtils.degToRad(90 - latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 180);
  const outward = new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  );
  return new THREE.Quaternion()
    .setFromUnitVectors(outward.normalize(), new THREE.Vector3(0, 0, 1))
    .normalize();
}
