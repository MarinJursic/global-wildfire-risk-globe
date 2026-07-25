"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Horizon, LayerKey } from "@/lib/contracts";
import {
  exposureFor,
  HORIZON_COPY,
  LAYER_LABELS,
  riskIntervalFor,
  STORY_FRAMES,
} from "@/lib/story";

const GlobeScene = dynamic(() => import("./GlobeScene").then((module) => module.GlobeScene), { ssr: false });

const HORIZONS: Horizon[] = ["6h", "24h", "48h", "72h", "7d"];
const LAYERS = Object.keys(LAYER_LABELS) as LayerKey[];

function formatArea(area: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(area);
}

export function WildfireDashboard() {
  const [horizon, setHorizon] = useState<Horizon>("24h");
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    wind: true,
    temperature: false,
    moisture: false,
    dryness: true,
    detections: true,
    uncertainty: true,
    scars: true,
    infrastructure: true,
  });
  const frame = STORY_FRAMES[frameIndex];
  const risk = useMemo(() => riskIntervalFor(frame, horizon), [frame, horizon]);
  const exposure = useMemo(() => exposureFor(frame), [frame]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const timer = window.setTimeout(() => setPlaying(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= STORY_FRAMES.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1400);
    return () => window.clearInterval(timer);
  }, [playing]);

  const timelineProgress = useMemo(
    () => `${(frameIndex / (STORY_FRAMES.length - 1)) * 100}%`,
    [frameIndex],
  );

  const toggleLayer = (layer: LayerKey) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div>
            <strong>EMBER</strong>
            <span>Global wildfire intelligence</span>
          </div>
        </div>
        <div className="event-status">
          <span className="live-dot" />
          <span>Story replay</span>
          <strong>EVROS · GREECE · 2023</strong>
        </div>
        <div className="topbar-meta">
          <span>SIMULATION <b>v0.4.2</b></span>
          <button
            type="button"
            aria-label={showInfo ? "Close information panel" : "Open information panel"}
            aria-expanded={showInfo}
            aria-controls="methodology-panel"
            onClick={() => setShowInfo((current) => !current)}
          >
            i
          </button>
        </div>
      </header>

      {showInfo && (
        <section className="info-panel" id="methodology-panel" aria-label="Replay methodology">
          <div>
            <span>RESEARCH DEMONSTRATION</span>
            <h2>Read the forecast as uncertainty, not certainty.</h2>
            <p>
              This deterministic replay uses synthetic, production-shaped values inspired by
              the 2023 Evros event. It is not connected to live alert feeds and must not be
              used for evacuation or incident response.
            </p>
            <p>
              The risk tabs convert a 24-hour cell estimate into cumulative event
              probabilities. The two fire-front outlines compare forecast p50 with the next
              cached observation contract; the translucent surface is the intended 90%
              coverage region.
            </p>
            <button type="button" onClick={() => setShowInfo(false)}>Close</button>
          </div>
        </section>
      )}

      <section className="workspace">
        <aside className="panel panel-left">
          <div className="panel-heading">
            <span>01 / FORECAST MODE</span>
            <small>Calibrated estimate</small>
          </div>
          <h1>Ignition risk</h1>
          <p className="lede">Probability of a <em>detectable</em> new fire, not certainty of ignition.</p>

          <div className="horizon-tabs" role="tablist" aria-label="Forecast horizon">
            {HORIZONS.map((item) => (
              <button
                type="button"
                role="tab"
                aria-selected={horizon === item}
                className={horizon === item ? "active" : ""}
                key={item}
                onClick={() => setHorizon(item)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const direction = event.key === "ArrowRight" ? 1 : -1;
                  const next = (HORIZONS.indexOf(item) + direction + HORIZONS.length) % HORIZONS.length;
                  setHorizon(HORIZONS[next]);
                  document.getElementById(`horizon-${HORIZONS[next]}`)?.focus();
                }}
                id={`horizon-${item}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="risk-card" aria-live="polite">
            <span className="eyebrow">{HORIZON_COPY[horizon]} horizon · selected cell</span>
            <div className="risk-range">
              <strong>{Math.round(risk.lower * 100)}</strong>
              <span>—</span>
              <strong>{Math.round(risk.upper * 100)}%</strong>
            </div>
            <div className="risk-bar"><i style={{ width: `${risk.point * 100}%` }} /></div>
            <p>Illustrative 95% calibration contract</p>
          </div>

          <div className="drivers">
            <span className="section-label">Dominant drivers</span>
            {[
              ["Fine-fuel moisture", "8.2%", 83],
              ["10 m wind", `${frame.windKph} km/h`, 69],
              ["2 m temperature", `${frame.temperatureC.toFixed(1)}°C`, 57],
              ["Soil moisture", `${Math.round(frame.soilMoisture * 100)}%`, 38],
            ].map(([label, value, score]) => (
              <div className="driver" key={label}>
                <div><span>{label}</span><b>{value}</b></div>
                <div className="driver-bar"><i style={{ width: `${score}%` }} /></div>
              </div>
            ))}
          </div>

          <div className="calibration">
            <span>Calibration metadata</span>
            <strong>ECE 0.031</strong>
            <small>Brier 0.087 · illustrative holdout</small>
          </div>
        </aside>

        <section className="globe-stage">
          <div className="stage-title">
            <span>Auto-focused significant event</span>
            <h2>Alexandroupolis / Evros</h2>
            <p>40.93° N · 25.86° E</p>
          </div>
          <div className="north-indicator"><span>N</span><i /></div>
          <GlobeScene frame={frame} layers={layers} />
          <div className="event-callout">
            <span className="callout-line" />
            <div>
              <small>ACTIVE FRONT · T+{frame.hour}H</small>
              <strong>{frame.frontKm.toFixed(1)} km perimeter</strong>
              <span>{frame.observationCount} satellite detections</span>
            </div>
          </div>
          <div className="globe-legend">
            <span><i className="legend-observed" />Observed</span>
            <span><i className="legend-forecast" />Forecast p50</span>
            <span><i className="legend-uncertainty" />90% envelope</span>
          </div>
          <span className="drag-hint">DRAG TO ORBIT</span>
        </section>

        <aside className="panel panel-right">
          <div className="panel-heading">
            <span>02 / ACTIVE FIRE</span>
            <small>Spread forecast</small>
          </div>
          <h2>Front dynamics</h2>
          <div className="wind-card">
            <div>
              <span>WIND VECTOR</span>
              <strong>{frame.windDirection}</strong>
            </div>
            <b>{frame.windKph}<small>km/h</small></b>
            <span className="wind-arrow" aria-hidden="true">↗</span>
          </div>

          <div className="metric-grid">
            <div><span>Expected area</span><strong>{formatArea(frame.areaHectares)}<small> ha</small></strong><em>+12.4% / 6h</em></div>
            <div><span>Arrival p50</span><strong>{Math.max(1.2, 9.4 - frameIndex * 1.35).toFixed(1)}<small> h</small></strong><em>± 2.1 h</em></div>
            <div><span>Settlement exposure</span><strong>{exposure.settlements}<small> zones</small></strong><em>{formatArea(exposure.people)} people</em></div>
            <div><span>Road exposure</span><strong>{exposure.roadsKm.toFixed(1)}<small> km</small></strong><em>E85 corridor</em></div>
            <div><span>Power-line exposure</span><strong>{exposure.powerLinesKm.toFixed(1)}<small> km</small></strong><em>modeled corridor</em></div>
            <div><span>Ecological exposure</span><strong>{formatArea(exposure.forestHectares)}<small> ha</small></strong><em>{formatArea(exposure.protectedAreaHectares)} ha protected</em></div>
          </div>

          <div className="layer-list">
            <span className="section-label">Map layers</span>
            {LAYERS.map((layer) => (
              <button
                type="button"
                key={layer}
                className={layers[layer] ? "enabled" : ""}
                aria-pressed={layers[layer]}
                onClick={() => toggleLayer(layer)}
              >
                <i className={`layer-swatch ${layer}`} />
                <span>{LAYER_LABELS[layer]}</span>
                <b>{layers[layer] ? "ON" : "OFF"}</b>
              </button>
            ))}
          </div>

          <div className="provenance">
            <span>REPLAY INPUTS</span>
            <div><b>VIIRS</b><small>Cached observation contract</small></div>
            <div><b>ERA5-Land</b><small>Deterministic weather field</small></div>
            <div><b>LIGHTNING</b><small>Unavailable in this cached event</small></div>
          </div>
        </aside>
      </section>

      <footer className="timeline">
        <button
          className="play-button"
          type="button"
          aria-label={playing ? "Pause story replay" : "Play story replay"}
          onClick={() => {
            if (frameIndex === STORY_FRAMES.length - 1) setFrameIndex(0);
            setPlaying((current) => !current);
          }}
        >
          {playing ? "Ⅱ" : "▶"}
        </button>
        <div className="timeline-main">
          <div className="timeline-labels">
            <span>FORECAST ISSUED <b>19 AUG · 06:00 UTC</b></span>
            <strong>{frame.label} UTC</strong>
            <span>NEXT OBSERVATION <b>{frameIndex === STORY_FRAMES.length - 1 ? "COMPLETE" : STORY_FRAMES[frameIndex + 1].label}</b></span>
          </div>
          <input
            type="range"
            min="0"
            max={STORY_FRAMES.length - 1}
            value={frameIndex}
            aria-label="Story replay time"
            onChange={(event) => { setFrameIndex(Number(event.target.value)); setPlaying(false); }}
            style={{ "--progress": timelineProgress } as React.CSSProperties}
          />
          <div className="timeline-ticks">
            {STORY_FRAMES.map((item, index) => <span key={item.hour} className={index <= frameIndex ? "past" : ""}>{item.hour}h</span>)}
          </div>
        </div>
        <div className="verification">
          <span>FORECAST / OBSERVATION</span>
          <div><strong>{frame.iou.toFixed(2)}</strong><small>IoU ↑</small></div>
          <div><strong>{frame.arrivalErrorMinutes}</strong><small>min MAE ↓</small></div>
          <div className="verification-status"><i /> OBSERVATION MATCHED</div>
        </div>
      </footer>
    </main>
  );
}
