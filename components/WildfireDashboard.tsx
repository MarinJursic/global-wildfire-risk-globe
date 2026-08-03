"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type {
  GlobeAction,
  GlobeCommand,
  Horizon,
  LayerKey,
} from "@/lib/contracts";
import {
  HISTORIC_INCIDENTS,
  SOURCE_MANIFESTS,
  sourcesForIncident,
} from "@/lib/incidents";
import {
  HORIZON_COPY,
  LAYER_LABELS,
  riskIntervalFor,
} from "@/lib/story";

const GlobeScene = dynamic(
  () => import("./GlobeScene").then((module) => module.GlobeScene),
  { ssr: false },
);

const HORIZONS: Horizon[] = ["6h", "24h", "48h", "72h", "7d"];
const LAYERS = Object.keys(LAYER_LABELS) as LayerKey[];
type Theme = "dark" | "light";

// The default historic replay is Evros; the index also covers Chile and Australia.
function formatArea(area: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(area);
}

export function WildfireDashboard() {
  const sourceDialogRef = useRef<HTMLElement>(null);
  const sourceCloseRef = useRef<HTMLButtonElement>(null);
  const sourcePreviousFocusRef = useRef<HTMLElement | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [incidentId, setIncidentId] = useState(HISTORIC_INCIDENTS[0].id);
  const [horizon, setHorizon] = useState<Horizon>("24h");
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [showSources, setShowSources] = useState(false);
  const [command, setCommand] = useState<GlobeCommand>({
    id: 0,
    action: "focus",
  });
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    wind: true,
    temperature: false,
    moisture: false,
    dryness: false,
    detections: true,
    uncertainty: false,
    scars: true,
    infrastructure: false,
  });

  const incident =
    HISTORIC_INCIDENTS.find((item) => item.id === incidentId) ??
    HISTORIC_INCIDENTS[0];
  const frames = incident.frames;
  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const risk = riskIntervalFor(frame, horizon);
  const incidentSources = sourcesForIncident(incident);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ember-theme");
    const preferredTheme = window.matchMedia("(prefers-color-scheme: light)")
      .matches
      ? "light"
      : "dark";
    const timer = window.setTimeout(() => {
      setTheme(
        savedTheme === "light" || savedTheme === "dark"
          ? savedTheme
          : preferredTheme,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ember-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= frames.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1300);
    return () => window.clearInterval(timer);
  }, [frames.length, playing]);

  useEffect(() => {
    if (!showSources) return;
    sourceCloseRef.current?.focus();

    const handleSourceDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowSources(false);
        return;
      }
      if (event.key !== "Tab" || !sourceDialogRef.current) return;

      const focusable = Array.from(
        sourceDialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleSourceDialogKeys);
    return () => {
      window.removeEventListener("keydown", handleSourceDialogKeys);
      sourcePreviousFocusRef.current?.focus();
    };
  }, [showSources]);

  const sendGlobeCommand = (action: GlobeAction) =>
    setCommand((current) => ({ id: current.id + 1, action }));

  const openSources = () => {
    sourcePreviousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setShowSources(true);
  };

  const chooseIncident = (nextId: string) => {
    setIncidentId(nextId);
    setFrameIndex(0);
    setPlaying(false);
    setShowSources(false);
    setCommand((current) => ({ id: current.id + 1, action: "focus" }));
  };

  const timelineProgress = `${(frameIndex / (frames.length - 1)) * 100}%`;

  return (
    <main
      className={`app-shell atlas-shell ${
        showInspector ? "inspector-open" : "inspector-closed"
      }`}
      data-theme={theme}
    >
      <header className="atlas-rail">
        <div className="atlas-brand">
          <span className="atlas-mark" aria-hidden="true">
            E
          </span>
          <div>
            <strong>WILDFIRE INTELLIGENCE</strong>
            <span>Global wildfire intelligence · planetary incident atlas</span>
          </div>
        </div>

        <div className="replay-truth">
          <i />
          <div>
            <strong>CLOSED HISTORIC CASE</strong>
            <span>Archived evidence · never live</span>
          </div>
        </div>

        <nav className="rail-actions" aria-label="Application controls">
          <button
            type="button"
            aria-controls="source-drawer"
            aria-expanded={showSources}
            aria-haspopup="dialog"
            onClick={() => (showSources ? setShowSources(false) : openSources())}
          >
            Sources
          </button>
          <button
            type="button"
            aria-label={showInfo ? "Close information panel" : "Open information panel"}
            aria-expanded={showInfo}
            aria-controls="methodology-panel"
            onClick={() => setShowInfo((current) => !current)}
          >
            Method
          </button>
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            aria-pressed={theme === "light"}
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          >
            <span aria-hidden="true">{theme === "dark" ? "☼" : "☾"}</span>
          </button>
        </nav>
      </header>

      {showInfo && (
        <section
          className="atlas-dialog"
          id="methodology-panel"
          role="region"
          aria-label="Replay methodology"
        >
          <span className="dialog-kicker">ARCHIVE + RESEARCH SCENARIO</span>
          <h2>Observed evidence and model output remain separate.</h2>
          <p>
            This product is not connected to live alert feeds. Historic locations,
            activation identifiers, sampled perimeter shapes, mapped-evidence
            points, and incident-day meteorology are derived from the exact CEMS
            and NASA products listed in Sources.
          </p>
          <p>
            Solid amber preserves a sampled CEMS perimeter shape, magnified
            cartographically for legibility. Dashed red and cyan are a separate,
            illustrative forecast scenario. Temperature, wetness, and dryness
            context are normalized visual encodings—not raw spatial grids.
          </p>
          <button type="button" onClick={() => setShowInfo(false)}>
            Close
          </button>
        </section>
      )}

      {showSources && (
        <aside
          className="source-drawer"
          id="source-drawer"
          ref={sourceDialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Data provenance for ${incident.activationCode}`}
          tabIndex={-1}
        >
          <header>
            <div>
              <span>PROVENANCE LEDGER</span>
              <h2>{incident.activationCode}</h2>
            </div>
            <button
              ref={sourceCloseRef}
              type="button"
              aria-label="Close data provenance"
              onClick={() => setShowSources(false)}
            >
              ×
            </button>
          </header>
          <p>
            Every displayed layer is bundled and deterministic. Opening this page
            does not request a live fire or weather service.
          </p>
          {incidentSources.map((source) => (
            <article key={source.id}>
              <span>{source.publisher}</span>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
              <small>{source.license}</small>
              <p>{source.note}</p>
            </article>
          ))}
          <footer>
            {SOURCE_MANIFESTS.length} source records bundled · accessed 26 Jul
            2026
          </footer>
        </aside>
      )}

      <aside className="incident-index" aria-label="Historic incident index">
        <header>
          <span>INCIDENT INDEX</span>
          <strong>{HISTORIC_INCIDENTS.length} documented activations</strong>
        </header>
        <div className="incident-list">
          {HISTORIC_INCIDENTS.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={item.id === incident.id ? "selected" : ""}
              aria-pressed={item.id === incident.id}
              onClick={() => chooseIncident(item.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.country} · {item.year}
                </small>
              </div>
              <i aria-hidden="true">↗</i>
            </button>
          ))}
        </div>
        <div className="coordinate-card">
          <span>ACTIVE COORDINATE</span>
          <strong>
            {Math.abs(incident.latitude).toFixed(2)}°{" "}
            {incident.latitude >= 0 ? "N" : "S"}
          </strong>
          <strong>
            {Math.abs(incident.longitude).toFixed(2)}°{" "}
            {incident.longitude >= 0 ? "E" : "W"}
          </strong>
        </div>
      </aside>

      <section className="atlas-stage" aria-label="Planetary incident map">
        <div className="stage-caption">
          <span>{incident.activationCode} · CLOSED ARCHIVE · NOT LIVE</span>
          <h1>{incident.name}</h1>
          <p>
            {incident.region}, {incident.country}
          </p>
        </div>

        <GlobeScene
          frame={frame}
          incident={incident}
          layers={layers}
          theme={theme}
          command={command}
        />

        <div className="globe-toolbar" aria-label="Globe controls">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => sendGlobeCommand("zoom-in")}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => sendGlobeCommand("zoom-out")}
          >
            −
          </button>
          <button type="button" onClick={() => sendGlobeCommand("focus")}>
            Focus
          </button>
          <button type="button" onClick={() => sendGlobeCommand("fit")}>
            Full Earth
          </button>
          <button type="button" onClick={() => sendGlobeCommand("reset")}>
            Reset
          </button>
        </div>

        <div className="map-key">
          <span>
            <i className="observed" /> Sampled CEMS burn perimeter
          </span>
          <span>
            <i className="forecast" /> Illustrative forecast p50
          </span>
          <span>
            <i className="uncertainty" /> Illustrative uncertainty envelope
          </span>
        </div>

        <div className="orbit-help">
          DRAG ANY DIRECTION · PINCH / SCROLL · ARROWS · + / − · HOME · R
        </div>
      </section>

      <aside
        className={`incident-inspector ${showInspector ? "open" : "closed"}`}
        aria-label="Incident inspector"
      >
        <button
          className="inspector-handle"
          type="button"
          aria-label={`${showInspector ? "Close" : "Open"} incident inspector`}
          aria-expanded={showInspector}
          aria-controls="incident-inspector-content"
          onClick={() => setShowInspector((current) => !current)}
        >
          {showInspector ? "→" : "←"}
        </button>
        {showInspector && (
          <div className="inspector-content" id="incident-inspector-content">
            <header>
              <span>HISTORIC EVIDENCE · CLOSED CASE</span>
              <strong>{incident.evidence.mappedAtUtc}</strong>
            </header>
            <div className="observed-stat">
              <span>{incident.evidence.productLabel}</span>
              <strong>{formatArea(incident.evidence.areaHectares)}</strong>
              <small>mapped hectares · CEMS vector product</small>
            </div>

            <section className="layer-matrix">
              <span>VISIBLE LAYERS</span>
              <div>
                {LAYERS.map((layer) => (
                  <button
                    type="button"
                    key={layer}
                    className={layers[layer] ? "enabled" : ""}
                    aria-label={`${LAYER_LABELS[layer]} ${
                      layers[layer] ? "on" : "off"
                    }`}
                    aria-pressed={layers[layer]}
                    onClick={() =>
                      setLayers((current) => ({
                        ...current,
                        [layer]: !current[layer],
                      }))
                    }
                  >
                    <i />
                    <span>{LAYER_LABELS[layer]}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="risk-module">
              <div>
                <span>Research scenario</span>
                <small>Illustrative · not an incident forecast</small>
              </div>
              <div className="horizon-tabs" role="tablist" aria-label="Forecast horizon">
                {HORIZONS.map((item) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={horizon === item}
                    aria-controls="risk-horizon-panel"
                    className={horizon === item ? "active" : ""}
                    key={item}
                    tabIndex={horizon === item ? 0 : -1}
                    onClick={() => setHorizon(item)}
                    onKeyDown={(event) => {
                      if (
                        event.key !== "ArrowLeft" &&
                        event.key !== "ArrowRight"
                      )
                        return;
                      event.preventDefault();
                      const direction = event.key === "ArrowRight" ? 1 : -1;
                      const next =
                        (HORIZONS.indexOf(item) +
                          direction +
                          HORIZONS.length) %
                        HORIZONS.length;
                      setHorizon(HORIZONS[next]);
                      document
                        .getElementById(`horizon-tab-${HORIZONS[next]}`)
                        ?.focus();
                    }}
                    id={`horizon-tab-${item}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div
                className="risk-output"
                id="risk-horizon-panel"
                role="tabpanel"
                aria-labelledby={`horizon-tab-${horizon}`}
              >
                <div className="risk-range" aria-live="polite">
                  <strong>{Math.round(risk.lower * 100)}</strong>
                  <span>—</span>
                  <strong>{Math.round(risk.upper * 100)}%</strong>
                </div>
                <p>
                  {HORIZON_COPY[horizon]} horizon · repeated 24-hour hazard
                  fixture, not a calibrated alert probability.
                </p>
              </div>
            </section>

            <dl className="incident-metrics">
              <div>
                <dt>Mapped evidence</dt>
                <dd>{incident.evidence.evidencePoints.length} points</dd>
              </div>
              <div>
                <dt>Display magnification</dt>
                <dd>{incident.evidence.displayMagnification}×</dd>
              </div>
              <div>
                <dt>NASA 10 m wind</dt>
                <dd>
                  {incident.evidence.weather.windSpeedMps.toFixed(2)} m/s · from{" "}
                  {incident.evidence.weather.windFromDegrees.toFixed(1)}°
                </dd>
              </div>
              <div>
                <dt>Mapped fire front</dt>
                <dd>
                  {incident.evidence.fireFrontKm
                    ? `${incident.evidence.fireFrontKm.toFixed(1)} km`
                    : "Not in product"}
                </dd>
              </div>
            </dl>
            <p className="metric-caveat">
              {incident.evidence.evidencePointLabel}. Shape is preserved but
              magnified for globe legibility. {incident.evidence.geometryMethod}
            </p>

            <section className="quantitative-legend" aria-label="Layer units and scales">
              <span>LAYER UNITS · HISTORIC-DAY POINT</span>
              <dl>
                <div>
                  <dt>Temperature</dt>
                  <dd>{incident.evidence.weather.temperatureC.toFixed(2)} °C</dd>
                  <small>orange context · 0–45 °C</small>
                </div>
                <div>
                  <dt>Soil wetness</dt>
                  <dd>{incident.evidence.weather.surfaceSoilWetness.toFixed(2)}</dd>
                  <small>cyan context · 0–1 fraction</small>
                </div>
                <div>
                  <dt>Dryness</dt>
                  <dd>
                    {(1 - incident.evidence.weather.surfaceSoilWetness).toFixed(2)}
                  </dd>
                  <small>amber · 1 − wetness, 0–1</small>
                </div>
                <div>
                  <dt>Wind</dt>
                  <dd>
                    {incident.evidence.weather.windSpeedMps.toFixed(2)} m/s
                  </dd>
                  <small>
                    from {incident.evidence.weather.windFromDegrees.toFixed(1)}°;
                    arrows point downwind
                  </small>
                </div>
              </dl>
              <p>
                {incident.evidence.weather.sourceLabel} ·{" "}
                {incident.evidence.weather.dateUtc}. Context dots are normalized
                encodings, not gridded measurements.
              </p>
            </section>

            <button
              className="source-summary"
              type="button"
              aria-controls="source-drawer"
              aria-haspopup="dialog"
              onClick={openSources}
            >
              <span>
                <strong>{incident.activationCode}</strong>
                <small>{incidentSources.length} provenance records</small>
              </span>
              <b>Review →</b>
            </button>
          </div>
        )}
      </aside>

      <footer className="forecast-filmstrip">
        <button
          className="play-button"
          type="button"
          aria-label={playing ? "Pause story replay" : "Play story replay"}
          onClick={() => {
            if (frameIndex === frames.length - 1) setFrameIndex(0);
            setPlaying((current) => !current);
          }}
        >
          {playing ? "Ⅱ" : "▶"}
        </button>
        <div className="filmstrip-main">
          <div className="filmstrip-heading">
            <span>ILLUSTRATIVE MODEL SEQUENCE</span>
            <strong>{frame.label} UTC</strong>
            <span>SCENARIO / NON-OPERATIONAL</span>
          </div>
          <input
            type="range"
            min="0"
            max={frames.length - 1}
            value={frameIndex}
            aria-label="Story replay time"
            onChange={(event) => {
              setFrameIndex(Number(event.target.value));
              setPlaying(false);
            }}
            style={{ "--progress": timelineProgress } as React.CSSProperties}
          />
          <div className="filmstrip-frames">
            {frames.map((item, index) => (
              <button
                type="button"
                key={`${incident.id}-${item.label}`}
                className={index === frameIndex ? "active" : ""}
                onClick={() => {
                  setFrameIndex(index);
                  setPlaying(false);
                }}
              >
                <i style={{ height: `${24 + index * 7}px` }} />
                <span>{item.label.split(" · ")[0]}</span>
                <small>{formatArea(item.areaHectares)} ha</small>
              </button>
            ))}
          </div>
        </div>
        <div className="forecast-verification">
          <span>REPLAY FIXTURE COMPARISON</span>
          <strong>{frame.iou.toFixed(2)} IoU</strong>
          <small>{frame.arrivalErrorMinutes} min deterministic error curve</small>
        </div>
      </footer>
    </main>
  );
}
