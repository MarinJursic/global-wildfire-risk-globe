"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import countriesTopology from "world-atlas/countries-110m.json";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { LayerKey, StoryFrame } from "@/lib/contracts";

interface GlobeSceneProps {
  frame: StoryFrame;
  layers: Record<LayerKey, boolean>;
  theme: "dark" | "light";
}

const EVROS = { lat: 40.93, lon: 25.86 };

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
  for (let d = 0; d <= 360; d += 4) {
    const angle = THREE.MathUtils.degToRad(d);
    points.push(new THREE.Vector3(Math.cos(angle) * latRadius, y, Math.sin(angle) * latRadius));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

export function countrySegments() {
  const topology = countriesTopology as unknown as Topology<{
    countries: GeometryCollection;
  }>;
  const countries = feature(topology, topology.objects.countries) as FeatureCollection<
    Geometry
  >;
  const points: THREE.Vector3[] = [];

  const addRing = (ring: number[][]) => {
    for (let index = 1; index < ring.length; index += 1) {
      const [previousLon, previousLat] = ring[index - 1];
      const [lon, lat] = ring[index];
      // Do not draw a chord through the globe when a polygon crosses the date line.
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
      country.geometry.coordinates.forEach((polygon) => polygon.forEach(addRing));
    }
  }

  return points;
}

export function GlobeScene({ frame, layers, theme }: GlobeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  const layersRef = useRef(layers);
  const themeRef = useRef(theme);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => { frameRef.current = frame; }, [frame]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0.15, 0.35, 5.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      const timer = window.setTimeout(() => setWebglError(true), 0);
      return () => window.clearTimeout(timer);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const globe = new THREE.Group();
    scene.add(globe);

    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x0b2930,
      emissive: 0x061518,
      emissiveIntensity: 0.7,
      shininess: 18,
      transparent: true,
      opacity: 0.98,
    });
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.72, 96, 96),
      sphereMaterial,
    );
    globe.add(sphere);

    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x7edfc8,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.78, 64, 64),
      atmosphereMaterial,
    );
    globe.add(atmosphere);

    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x3c716f, transparent: true, opacity: 0.2 });
    for (let lat = -60; lat <= 60; lat += 20) globe.add(lineCircle(1.725, lat, gridMaterial));
    for (let lon = 0; lon < 180; lon += 20) {
      const curve = new THREE.EllipseCurve(0, 0, 1.725, 1.725, 0, Math.PI * 2);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(96));
      const line = new THREE.Line(geometry, gridMaterial);
      line.rotation.y = Math.PI / 2;
      line.rotation.z = THREE.MathUtils.degToRad(lon);
      globe.add(line);
    }

    const countryMaterial = new THREE.LineBasicMaterial({
      color: 0x769b78,
      transparent: true,
      opacity: 0.86,
    });
    const countryLines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(countrySegments()),
      countryMaterial,
    );
    countryLines.name = "Natural Earth 1:110m country boundaries";
    globe.add(countryLines);

    const eventAnchor = toVector(EVROS.lat, EVROS.lon, 1.78);
    const focusQuaternion = new THREE.Quaternion().setFromUnitVectors(
      eventAnchor.clone().normalize(),
      new THREE.Vector3(0, 0, 1),
    );
    const startQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-0.18, -1.35, 0.08),
    );
    globe.quaternion.copy(startQuaternion);
    const eventGroup = new THREE.Group();
    eventGroup.position.copy(eventAnchor);
    eventGroup.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      eventAnchor.clone().normalize(),
    );
    globe.add(eventGroup);

    const haloMaterial = new THREE.MeshBasicMaterial({ color: 0xff7045, transparent: true, opacity: 0.34, side: THREE.DoubleSide });
    const forecastHalo = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.29, 64), haloMaterial);
    eventGroup.add(forecastHalo);

    const frontPoints = (xRadius: number, yRadius: number, z: number) => {
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= 64; step += 1) {
        const angle = (step / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * xRadius, Math.sin(angle) * yRadius, z));
      }
      return points;
    };
    const forecastFront = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(frontPoints(0.17, 0.095, 0.012)),
      new THREE.LineDashedMaterial({ color: 0xff7045, dashSize: 0.025, gapSize: 0.014 }),
    );
    forecastFront.computeLineDistances();
    eventGroup.add(forecastFront);
    const observedFront = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(frontPoints(0.15, 0.083, 0.016)),
      new THREE.LineBasicMaterial({ color: 0xffe0a1, transparent: true, opacity: 0.95 }),
    );
    eventGroup.add(observedFront);

    const heatCore = new THREE.Mesh(
      new THREE.CircleGeometry(0.065, 48),
      new THREE.MeshBasicMaterial({ color: 0xffc36c, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
    );
    heatCore.position.z = 0.007;
    eventGroup.add(heatCore);

    const detectionGeometry = new THREE.BufferGeometry();
    const detections: THREE.Vector3[] = [];
    for (let i = 0; i < 36; i++) {
      const angle = i * 2.39996;
      const radius = 0.05 + (i % 8) * 0.018;
      detections.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.009));
    }
    detectionGeometry.setFromPoints(detections);
    const detectionPoints = new THREE.Points(
      detectionGeometry,
      new THREE.PointsMaterial({ color: 0xffdf9b, size: 0.038, transparent: true, opacity: 0.95 }),
    );
    eventGroup.add(detectionPoints);

    const riskCells: THREE.Mesh[] = [];
    [
      [38.6, -121.5, 0xff9d58],
      [-33.5, 147.2, 0xffbf68],
      [-10.1, -55.4, 0xeeb260],
      [40.93, 25.86, 0xff7045],
      [49.3, -119.7, 0xffa95d],
    ].forEach(([lat, lon, color]) => {
      const anchor = toVector(lat, lon, 1.755);
      const group = new THREE.Group();
      group.position.copy(anchor);
      group.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        anchor.clone().normalize(),
      );
      const cell = new THREE.Mesh(
        new THREE.RingGeometry(0.025, 0.055, 6),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.56,
          side: THREE.DoubleSide,
        }),
      );
      group.add(cell);
      globe.add(group);
      riskCells.push(cell);
    });

    const makeClimateLayer = (color: number, offset: number) => {
      const positions: THREE.Vector3[] = [];
      for (let lat = -50; lat <= 65; lat += 9) {
        for (let lon = -170; lon <= 170; lon += 11) {
          if (Math.sin(lat * 0.17 + lon * 0.08 + offset) > 0.58) {
            positions.push(toVector(lat, lon, 1.746));
          }
        }
      }
      return new THREE.Points(
        new THREE.BufferGeometry().setFromPoints(positions),
        new THREE.PointsMaterial({ color, size: 0.035, transparent: true, opacity: 0.38 }),
      );
    };
    const temperatureLayer = makeClimateLayer(0xff7856, 0.5);
    const moistureLayer = makeClimateLayer(0x58a8d8, 2.2);
    globe.add(temperatureLayer, moistureLayer);

    const scarGroup = new THREE.Group();
    [
      [40.72, 25.58, 0.13],
      [38.8, 23.4, 0.08],
      [36.7, 22.2, 0.06],
    ].forEach(([lat, lon, size]) => {
      const anchor = toVector(lat, lon, 1.747);
      const group = new THREE.Group();
      group.position.copy(anchor);
      group.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        anchor.clone().normalize(),
      );
      group.add(new THREE.Mesh(
        new THREE.RingGeometry(size * 0.58, size, 24),
        new THREE.MeshBasicMaterial({
          color: 0x361b17,
          transparent: true,
          opacity: 0.72,
          side: THREE.DoubleSide,
        }),
      ));
      scarGroup.add(group);
    });
    globe.add(scarGroup);

    const infrastructureGroup = new THREE.Group();
    const road = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        toVector(40.63, 25.45, 1.759),
        toVector(40.78, 25.61, 1.759),
        toVector(40.93, 25.86, 1.759),
        toVector(41.08, 26.05, 1.759),
      ]),
      new THREE.LineBasicMaterial({ color: 0xd7eee7, transparent: true, opacity: 0.72 }),
    );
    infrastructureGroup.add(road);
    const assetPoints = [
      toVector(40.85, 25.77, 1.768),
      toVector(40.97, 25.91, 1.768),
      toVector(41.03, 25.98, 1.768),
    ];
    infrastructureGroup.add(new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(assetPoints),
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.045, transparent: true, opacity: 0.9 }),
    ));
    globe.add(infrastructureGroup);

    const windParticles: THREE.Mesh[] = [];
    for (let i = 0; i < 30; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xa6eee1, transparent: true, opacity: 0.5 }),
      );
      p.userData.offset = i / 30;
      scene.add(p);
      windParticles.push(p);
    }

    scene.add(new THREE.AmbientLight(0x8ecbc0, 1.1));
    const key = new THREE.DirectionalLight(0xffd5aa, 2.4);
    key.position.set(-3, 2, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6cbfb3, 2);
    rim.position.set(4, -2, -3);
    scene.add(rim);

    let dragging = false;
    let lastX = 0;
    let userInteracted = false;
    const onDown = (event: PointerEvent) => {
      dragging = true;
      userInteracted = true;
      lastX = event.clientX;
      mount.focus();
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      globe.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), (event.clientX - lastX) * 0.006);
      lastX = event.clientX;
    };
    const onUp = () => { dragging = false; };
    const onKeyDown = (event: KeyboardEvent) => {
      const rotation = 0.08;
      if (event.key === "Home") {
        event.preventDefault();
        userInteracted = true;
        globe.quaternion.copy(focusQuaternion);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        userInteracted = true;
        globe.rotateOnWorldAxis(
          new THREE.Vector3(0, 1, 0),
          event.key === "ArrowLeft" ? -rotation : rotation,
        );
      } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        userInteracted = true;
        globe.rotateOnWorldAxis(
          new THREE.Vector3(1, 0, 0),
          event.key === "ArrowUp" ? -rotation : rotation,
        );
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onUp);
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
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationId = 0;
    const render = () => {
      const t = clock.getElapsedTime();
      const progress = frameRef.current.hour / 30;
      const lightTheme = themeRef.current === "light";
      sphereMaterial.color.setHex(lightTheme ? 0xe6f0ec : 0x0b2930);
      sphereMaterial.emissive.setHex(lightTheme ? 0x546b66 : 0x061518);
      sphereMaterial.emissiveIntensity = lightTheme ? 0.18 : 0.7;
      countryMaterial.color.setHex(lightTheme ? 0x376a58 : 0x769b78);
      gridMaterial.color.setHex(lightTheme ? 0x78958c : 0x3c716f);
      atmosphereMaterial.color.setHex(lightTheme ? 0x5b927f : 0x7edfc8);
      if (!userInteracted) {
        const focusProgress = reducedMotion ? 1 : Math.min(1, t / 2.2);
        const eased = 1 - (1 - focusProgress) ** 3;
        globe.quaternion.slerpQuaternions(startQuaternion, focusQuaternion, eased);
      }
      const pulse = reducedMotion ? 0 : Math.sin(t * 2.2) * 0.035;
      forecastHalo.scale.setScalar(0.78 + progress * 0.85 + pulse);
      forecastFront.scale.set(0.8 + progress * 1.15, 0.75 + progress * 0.84, 1);
      observedFront.scale.set(
        0.78 + progress * (1.1 + (1 - frameRef.current.iou) * 0.5),
        0.76 + progress * 0.9,
        1,
      );
      heatCore.scale.set(1 + progress * 0.65, 0.8 + progress * 0.4, 1);
      forecastHalo.visible = layersRef.current.uncertainty;
      detectionPoints.visible = layersRef.current.detections;
      detectionGeometry.setDrawRange(
        0,
        Math.min(detections.length, Math.max(3, Math.ceil(frameRef.current.observationCount / 4))),
      );
      countryMaterial.color.setHex(
        layersRef.current.dryness
          ? lightTheme
            ? 0x85612f
            : 0x9d7a51
          : lightTheme
            ? 0x376a58
            : 0x769b78,
      );
      temperatureLayer.visible = layersRef.current.temperature;
      moistureLayer.visible = layersRef.current.moisture;
      scarGroup.visible = layersRef.current.scars;
      infrastructureGroup.visible = layersRef.current.infrastructure;
      riskCells.forEach((cell, index) => {
        const scale = reducedMotion ? 1 : 0.9 + Math.sin(t * 2 + index) * 0.16;
        cell.scale.setScalar(scale);
      });
      windParticles.forEach((particle, index) => {
        const a = (particle.userData.offset + (reducedMotion ? 0 : t * 0.035)) % 1;
        const angle = a * Math.PI * 2 + index * 0.71;
        const radius = 1.86;
        particle.position.set(Math.cos(angle) * radius, Math.sin(angle * 0.52) * 0.72, Math.sin(angle) * radius);
        particle.visible = layersRef.current.wind;
      });
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      mount.removeEventListener("keydown", onKeyDown);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      className="globe-canvas"
      ref={mountRef}
      role="application"
      tabIndex={0}
      aria-label={`Interactive 3D globe focused on the Evros wildfire at forecast hour ${frame.hour}. Drag or use arrow keys to orbit; press Home to refocus.`}
    >
      {webglError && (
        <p className="globe-fallback" role="status">
          The 3D globe could not start. Forecast controls and metrics remain available.
        </p>
      )}
    </div>
  );
}
