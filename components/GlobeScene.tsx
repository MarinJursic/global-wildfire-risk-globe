"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import countriesTopology from "world-atlas/countries-110m.json";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import type {
  GlobeCommand,
  HistoricIncident,
  LayerKey,
  StoryFrame,
} from "@/lib/contracts";
import { HISTORIC_INCIDENTS } from "@/lib/incidents";
import { globeLayerState } from "@/lib/layer-state";
import {
  applyArcballDelta,
  clampCameraDistance,
  decayVelocity,
  focusQuaternion,
  shouldApplyInertia,
} from "./globe/ArcballController";

interface GlobeSceneProps {
  frame: StoryFrame;
  incident: HistoricIncident;
  layers: Record<LayerKey, boolean>;
  theme: "dark" | "light";
  command: GlobeCommand;
}

export function toVector(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function lineCircle(radius: number, latitude: number, material: THREE.Material) {
  const points: THREE.Vector3[] = [];
  const latRadius = radius * Math.cos(THREE.MathUtils.degToRad(latitude));
  const y = radius * Math.sin(THREE.MathUtils.degToRad(latitude));
  for (let degree = 0; degree <= 360; degree += 4) {
    const angle = THREE.MathUtils.degToRad(degree);
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * latRadius,
        y,
        Math.sin(angle) * latRadius,
      ),
    );
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    material,
  );
}

export function countrySegments() {
  const topology = countriesTopology as unknown as Topology<{
    countries: GeometryCollection;
  }>;
  const countries = feature(
    topology,
    topology.objects.countries,
  ) as FeatureCollection<Geometry>;
  const points: THREE.Vector3[] = [];

  const addRing = (ring: number[][]) => {
    for (let index = 1; index < ring.length; index += 1) {
      const [previousLon, previousLat] = ring[index - 1];
      const [lon, lat] = ring[index];
      if (Math.abs(lon - previousLon) > 180) continue;
      points.push(
        toVector(previousLat, previousLon, 1.738),
        toVector(lat, lon, 1.738),
      );
    }
  };

  for (const country of countries.features) {
    if (country.geometry?.type === "Polygon") {
      country.geometry.coordinates.forEach(addRing);
    } else if (country.geometry?.type === "MultiPolygon") {
      country.geometry.coordinates.forEach((polygon) =>
        polygon.forEach(addRing),
      );
    }
  }

  return points;
}

export function isFrontFacing(
  localPosition: THREE.Vector3,
  globeOrientation: THREE.Quaternion,
) {
  return localPosition.clone().applyQuaternion(globeOrientation).z > 0.06;
}

export function projectGlobePoint(
  localPosition: THREE.Vector3,
  globeOrientation: THREE.Quaternion,
  camera: THREE.Camera,
  width: number,
  height: number,
) {
  const projected = localPosition
    .clone()
    .applyQuaternion(globeOrientation)
    .project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (-projected.y * 0.5 + 0.5) * height,
  };
}

function perimeterPoints(xRadius: number, yRadius: number, z = 0.012) {
  const points: THREE.Vector3[] = [];
  for (let step = 0; step <= 80; step += 1) {
    const angle = (step / 80) * Math.PI * 2;
    const irregularity =
      1 + Math.sin(angle * 3.2) * 0.09 + Math.cos(angle * 5.3) * 0.05;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * xRadius * irregularity,
        Math.sin(angle) * yRadius * irregularity,
        z,
      ),
    );
  }
  return points;
}

function makeSurfaceField(
  name: string,
  color: number,
  phase: number,
  threshold: number,
) {
  const points: THREE.Vector3[] = [];
  for (let latitude = -72; latitude <= 72; latitude += 6) {
    for (let longitude = -180; longitude < 180; longitude += 6) {
      const signal =
        Math.sin(THREE.MathUtils.degToRad(latitude * 2.4) + phase) +
        Math.cos(THREE.MathUtils.degToRad(longitude * 1.55) - phase);
      if (signal > threshold) {
        points.push(toVector(latitude, longitude, 1.746));
      }
    }
  }
  const field = new THREE.Points(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.PointsMaterial({
      color,
      size: 0.024,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  field.name = name;
  return field;
}

export function GlobeScene({
  frame,
  incident,
  layers,
  theme,
  command,
}: GlobeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  const incidentRef = useRef(incident);
  const layersRef = useRef(layers);
  const themeRef = useRef(theme);
  const commandRef = useRef(command);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);
  useEffect(() => {
    incidentRef.current = incident;
  }, [incident]);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  useEffect(() => {
    commandRef.current = command;
  }, [command]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 5.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      const timer = window.setTimeout(() => setWebglError(true), 0);
      return () => window.clearTimeout(timer);
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const globe = new THREE.Group();
    scene.add(globe);

    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x12382f,
      emissive: 0x04120f,
      emissiveIntensity: 0.38,
      metalness: 0.04,
      roughness: 0.86,
    });
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.72, 128, 128),
      sphereMaterial,
    );
    globe.add(sphere);

    const oceanSheen = new THREE.Mesh(
      new THREE.SphereGeometry(1.728, 96, 96),
      new THREE.MeshPhysicalMaterial({
        color: 0x092432,
        transparent: true,
        opacity: 0.42,
        roughness: 0.3,
        clearcoat: 0.5,
        side: THREE.FrontSide,
      }),
    );
    globe.add(oceanSheen);

    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x78c9d6,
      transparent: true,
      opacity: 0.09,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.79, 80, 80),
      atmosphereMaterial,
    );
    globe.add(atmosphere);

    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x85a39b,
      transparent: true,
      opacity: 0.16,
    });
    for (let latitude = -60; latitude <= 60; latitude += 20) {
      globe.add(lineCircle(1.735, latitude, gridMaterial));
    }
    for (let longitude = 0; longitude < 180; longitude += 20) {
      const curve = new THREE.EllipseCurve(
        0,
        0,
        1.735,
        1.735,
        0,
        Math.PI * 2,
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(120),
      );
      const line = new THREE.Line(geometry, gridMaterial);
      line.rotation.y = Math.PI / 2;
      line.rotation.z = THREE.MathUtils.degToRad(longitude);
      globe.add(line);
    }

    const countryMaterial = new THREE.LineBasicMaterial({
      color: 0xa9c1a3,
      transparent: true,
      opacity: 0.82,
    });
    const countryLines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(countrySegments()),
      countryMaterial,
    );
    countryLines.name = "Natural Earth 1:110m country boundaries";
    globe.add(countryLines);

    // Deterministic global scalar-field fixtures. Each control owns a distinct
    // visible encoding instead of merely recoloring another layer.
    const temperatureField = makeSurfaceField(
      "temperature-field-fixture",
      0xff8f56,
      0.2,
      1.02,
    );
    const moistureField = makeSurfaceField(
      "soil-moisture-field-fixture",
      0x4bc3d4,
      2.1,
      1.08,
    );
    const drynessField = makeSurfaceField(
      "fuel-dryness-field-fixture",
      0xffd36a,
      4.2,
      1.13,
    );
    globe.add(temperatureField, moistureField, drynessField);

    const windGroup = new THREE.Group();
    windGroup.name = "wind-vector-fixture";
    const windMaterial = new THREE.LineBasicMaterial({
      color: 0xe9fbf4,
      transparent: true,
      opacity: 0.72,
    });
    for (let latitude = -60; latitude <= 60; latitude += 20) {
      for (let longitude = -160; longitude <= 160; longitude += 40) {
        const start = toVector(latitude, longitude, 1.762);
        const end = toVector(
          latitude + Math.sin(THREE.MathUtils.degToRad(longitude)) * 2.5,
          longitude + 7,
          1.762,
        );
        windGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([start, end]),
            windMaterial,
          ),
        );
      }
    }
    globe.add(windGroup);

    const incidentGroups = new Map<string, THREE.Group>();
    const assetGroups = new Map<string, THREE.Group>();
    const markerPositions = new Map<string, THREE.Vector3>();
    const observedMaterial = new THREE.LineBasicMaterial({
      color: 0xffb866,
      transparent: true,
      opacity: 0.98,
    });
    const forecastMaterial = new THREE.LineDashedMaterial({
      color: 0xef6550,
      dashSize: 0.025,
      gapSize: 0.014,
      transparent: true,
      opacity: 0.94,
    });
    const envelopeMaterial = new THREE.MeshBasicMaterial({
      color: 0x60bdd0,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (const historicIncident of HISTORIC_INCIDENTS) {
      const anchor = toVector(
        historicIncident.latitude,
        historicIncident.longitude,
        1.755,
      );
      markerPositions.set(historicIncident.id, anchor);
      const group = new THREE.Group();
      group.position.copy(anchor);
      group.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        anchor.clone().normalize(),
      );
      group.userData.incidentId = historicIncident.id;

      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.025, 0.046, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffb866,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
        }),
      );
      marker.name = "historic-incident-marker";
      group.add(marker);

      const observed = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          perimeterPoints(0.11, 0.074, 0.014),
        ),
        observedMaterial,
      );
      observed.name = "observed-perimeter";
      group.add(observed);

      const forecast = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          perimeterPoints(0.14, 0.095, 0.017),
        ),
        forecastMaterial,
      );
      forecast.computeLineDistances();
      forecast.name = "illustrative-forecast-p50";
      group.add(forecast);

      const envelope = new THREE.Mesh(
        new THREE.RingGeometry(0.1, 0.18, 64),
        envelopeMaterial,
      );
      envelope.name = "illustrative-forecast-envelope";
      group.add(envelope);

      const detections: THREE.Vector3[] = [];
      for (let index = 0; index < 42; index += 1) {
        const angle = index * 2.39996;
        const radius = 0.028 + (index % 9) * 0.013;
        detections.push(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius * 0.7,
            0.021,
          ),
        );
      }
      const detectionPoints = new THREE.Points(
        new THREE.BufferGeometry().setFromPoints(detections),
        new THREE.PointsMaterial({
          color: 0xffe0a1,
          size: 0.027,
          transparent: true,
          opacity: 0.9,
        }),
      );
      detectionPoints.name = "cached-detection-sample";
      group.add(detectionPoints);

      const scar = new THREE.Mesh(
        new THREE.CircleGeometry(0.105, 64),
        new THREE.MeshBasicMaterial({
          color: 0x4f241a,
          transparent: true,
          opacity: 0.72,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      scar.position.z = 0.006;
      scar.name = "burn-scar-fixture";
      group.add(scar);

      globe.add(group);
      incidentGroups.set(historicIncident.id, group);

      const assetGroup = new THREE.Group();
      assetGroup.name = historicIncident.assetFixture.label;
      assetGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(
            historicIncident.assetFixture.corridor.map((point) =>
              toVector(point.latitude, point.longitude, 1.765),
            ),
          ),
          new THREE.LineBasicMaterial({
            color: 0xe3eee9,
            transparent: true,
            opacity: 0.82,
          }),
        ),
      );
      assetGroup.add(
        new THREE.Points(
          new THREE.BufferGeometry().setFromPoints(
            historicIncident.assetFixture.criticalSites.map((point) =>
              toVector(point.latitude, point.longitude, 1.77),
            ),
          ),
          new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.043,
            transparent: true,
            opacity: 0.95,
          }),
        ),
      );
      globe.add(assetGroup);
      assetGroups.set(historicIncident.id, assetGroup);
    }

    scene.add(new THREE.HemisphereLight(0xc7e3dc, 0x071614, 1.8));
    const sun = new THREE.DirectionalLight(0xffefd3, 2.8);
    sun.position.set(-4, 3, 5);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x5bb0c4, 1.6);
    rim.position.set(4, -2, -3);
    scene.add(rim);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let currentIncidentId = incidentRef.current.id;
    let targetOrientation = focusQuaternion(
      incidentRef.current.latitude,
      incidentRef.current.longitude,
    );
    globe.quaternion.copy(targetOrientation);
    let animatingFocus = false;
    let cameraDistance = 5.4;
    let targetCameraDistance = 5.4;
    let processedCommand = -1;
    const angularVelocity = new THREE.Vector2();
    const pointers = new Map<number, { x: number; y: number }>();
    let previousPinchDistance = 0;

    const focusActiveIncident = () => {
      targetOrientation = focusQuaternion(
        incidentRef.current.latitude,
        incidentRef.current.longitude,
      );
      targetCameraDistance = 4.65;
      animatingFocus = true;
      angularVelocity.set(0, 0);
    };

    const onPointerDown = (event: PointerEvent) => {
      mount.focus();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      renderer.domElement.setPointerCapture(event.pointerId);
      animatingFocus = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const next = { x: event.clientX, y: event.clientY };
      pointers.set(event.pointerId, next);
      if (pointers.size === 1) {
        const deltaX = next.x - previous.x;
        const deltaY = next.y - previous.y;
        globe.quaternion.copy(
          applyArcballDelta(globe.quaternion, deltaX, deltaY),
        );
        angularVelocity.set(deltaX, deltaY);
      } else if (pointers.size === 2) {
        const [first, second] = [...pointers.values()];
        const pinchDistance = Math.hypot(
          first.x - second.x,
          first.y - second.y,
        );
        if (previousPinchDistance > 0) {
          targetCameraDistance = clampCameraDistance(
            targetCameraDistance -
              (pinchDistance - previousPinchDistance) * 0.012,
          );
        }
        previousPinchDistance = pinchDistance;
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) previousPinchDistance = 0;
      if (reducedMotion) angularVelocity.set(0, 0);
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetCameraDistance = clampCameraDistance(
        targetCameraDistance + event.deltaY * 0.004,
      );
    };
    const onDoubleClick = () => focusActiveIncident();
    const onKeyDown = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 16 : 8;
      let directRotation = false;
      if (event.key === "ArrowLeft") {
        globe.quaternion.copy(applyArcballDelta(globe.quaternion, -step, 0));
        directRotation = true;
      } else if (event.key === "ArrowRight") {
        globe.quaternion.copy(applyArcballDelta(globe.quaternion, step, 0));
        directRotation = true;
      } else if (event.key === "ArrowUp") {
        globe.quaternion.copy(applyArcballDelta(globe.quaternion, 0, -step));
        directRotation = true;
      } else if (event.key === "ArrowDown") {
        globe.quaternion.copy(applyArcballDelta(globe.quaternion, 0, step));
        directRotation = true;
      } else if (event.key === "+" || event.key === "=") {
        targetCameraDistance = clampCameraDistance(targetCameraDistance - 0.45);
      } else if (event.key === "-" || event.key === "_") {
        targetCameraDistance = clampCameraDistance(targetCameraDistance + 0.45);
      } else if (
        event.key === "Home" ||
        event.key.toLowerCase() === "f"
      ) {
        focusActiveIncident();
      } else if (event.key.toLowerCase() === "r") {
        targetOrientation = new THREE.Quaternion();
        targetCameraDistance = 5.8;
        animatingFocus = true;
      } else {
        return;
      }
      event.preventDefault();
      if (directRotation) animatingFocus = false;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("dblclick", onDoubleClick);
    mount.addEventListener("keydown", onKeyDown);

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const clock = new THREE.Clock();
    let animationId = 0;
    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.04);
      const activeIncident = incidentRef.current;

      if (activeIncident.id !== currentIncidentId) {
        currentIncidentId = activeIncident.id;
        focusActiveIncident();
      }

      if (commandRef.current.id !== processedCommand) {
        processedCommand = commandRef.current.id;
        switch (commandRef.current.action) {
          case "focus":
            focusActiveIncident();
            break;
          case "fit":
            targetCameraDistance = 5.8;
            break;
          case "zoom-in":
            targetCameraDistance = clampCameraDistance(
              targetCameraDistance - 0.5,
            );
            break;
          case "zoom-out":
            targetCameraDistance = clampCameraDistance(
              targetCameraDistance + 0.5,
            );
            break;
          case "reset":
            targetOrientation = new THREE.Quaternion();
            targetCameraDistance = 5.8;
            animatingFocus = true;
            break;
        }
      }

      if (animatingFocus) {
        const factor = reducedMotion ? 1 : 1 - Math.exp(-delta * 6.4);
        globe.quaternion.slerp(targetOrientation, factor);
        if (globe.quaternion.angleTo(targetOrientation) < 0.002) {
          globe.quaternion.copy(targetOrientation);
          animatingFocus = false;
        }
      } else if (
        shouldApplyInertia(
          reducedMotion,
          pointers.size,
          angularVelocity.lengthSq(),
        )
      ) {
        globe.quaternion.copy(
          applyArcballDelta(
            globe.quaternion,
            angularVelocity.x * delta * 15,
            angularVelocity.y * delta * 15,
          ),
        );
        decayVelocity(angularVelocity, delta);
      }

      cameraDistance = THREE.MathUtils.lerp(
        cameraDistance,
        targetCameraDistance,
        reducedMotion ? 1 : 1 - Math.exp(-delta * 8),
      );
      camera.position.z = cameraDistance;
      camera.updateMatrixWorld();

      const light = themeRef.current === "light";
      sphereMaterial.color.setHex(light ? 0xb8cab8 : 0x12382f);
      sphereMaterial.emissive.setHex(light ? 0x273e37 : 0x04120f);
      oceanSheen.material.color.setHex(light ? 0x75a9b7 : 0x092432);
      countryMaterial.color.setHex(light ? 0x315845 : 0xa9c1a3);
      gridMaterial.color.setHex(light ? 0x56736a : 0x85a39b);
      atmosphereMaterial.color.setHex(light ? 0x438aa1 : 0x78c9d6);

      const progress = frameRef.current.hour / 30;
      const layerVisibility = globeLayerState(layersRef.current);
      for (const [id, group] of incidentGroups) {
        const active = id === activeIncident.id;
        group.children.forEach((child) => {
          if (child.name === "historic-incident-marker") {
            child.visible = true;
            child.scale.setScalar(active ? 1.45 : 0.85);
          } else {
            child.visible = active;
          }
          if (child.name === "observed-perimeter") {
            child.scale.set(
              0.56 + progress * 1.25,
              0.56 + progress * 1.12,
              1,
            );
          }
          if (child.name === "illustrative-forecast-p50") {
            child.visible = active && layerVisibility.uncertainty;
            child.scale.set(
              0.62 + progress * 1.3,
              0.6 + progress * 1.2,
              1,
            );
          }
          if (child.name === "illustrative-forecast-envelope") {
            child.visible = active && layerVisibility.uncertainty;
            child.scale.setScalar(0.58 + progress * 1.08);
          }
          if (child.name === "cached-detection-sample") {
            child.visible = active && layerVisibility.detections;
            if (child instanceof THREE.Points) {
              child.geometry.setDrawRange(
                0,
                Math.min(
                  42,
                  Math.max(4, Math.ceil(frameRef.current.observationCount / 2)),
                ),
              );
            }
          }
          if (child.name === "burn-scar-fixture") {
            child.visible = active && layerVisibility.scars;
            child.scale.set(
              0.48 + progress * 1.2,
              0.48 + progress * 1.05,
              1,
            );
          }
        });
      }
      temperatureField.visible = layerVisibility.temperature;
      moistureField.visible = layerVisibility.moisture;
      drynessField.visible = layerVisibility.dryness;
      windGroup.visible = layerVisibility.wind;
      if (layerVisibility.wind && !reducedMotion) {
        windGroup.rotation.y += delta * 0.045;
      }
      gridMaterial.opacity = 0.16;
      for (const [id, assetGroup] of assetGroups) {
        assetGroup.visible =
          layerVisibility.infrastructure && id === activeIncident.id;
      }

      const labelLayer = labelsRef.current;
      if (labelLayer) {
        const width = mount.clientWidth;
        const height = mount.clientHeight;
        for (const historicIncident of HISTORIC_INCIDENTS) {
          const label = labelLayer.querySelector<HTMLElement>(
            `[data-incident-label="${historicIncident.id}"]`,
          );
          const point = markerPositions.get(historicIncident.id);
          if (!label || !point) continue;
          const visible = isFrontFacing(point, globe.quaternion);
          label.hidden = !visible;
          if (visible) {
            const screen = projectGlobePoint(
              point,
              globe.quaternion,
              camera,
              width,
              height,
            );
            label.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`;
            label.dataset.active = String(
              historicIncident.id === activeIncident.id,
            );
          }
        }
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      mount.removeEventListener("keydown", onKeyDown);
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Points
        ) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="globe-viewport">
      <div
        className="globe-canvas"
        ref={mountRef}
        role="application"
        tabIndex={0}
        aria-label={`Interactive 3D globe focused on the historic ${incident.name}, ${incident.country} wildfire replay at forecast hour ${frame.hour}. Drag in any direction or use arrow keys to orbit across both poles. Use plus and minus to zoom, Home to refocus, and R to reset Earth.`}
      >
        {webglError && (
          <p className="globe-fallback" role="status">
            The 3D globe could not start. Incident controls, observations, and
            provenance remain available.
          </p>
        )}
      </div>
      <div className="projected-labels" ref={labelsRef} aria-hidden="true">
        {HISTORIC_INCIDENTS.map((item) => (
          <span key={item.id} data-incident-label={item.id}>
            <i />
            <b>{item.name}</b>
            <small>{item.country}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
