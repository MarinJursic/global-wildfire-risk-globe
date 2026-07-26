// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WildfireDashboard } from "../components/WildfireDashboard";

vi.mock("next/dynamic", () => ({
  default: () => function GlobeStub() {
    return <div data-testid="globe-scene" />;
  },
}));

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

describe("wildfire dashboard controls", () => {
  it("changes the probability when the forecast horizon changes", () => {
    const { container } = render(<WildfireDashboard />);
    const riskRange = container.querySelector(".risk-range");
    expect(riskRange?.textContent).toMatch(/18—27%/);

    fireEvent.click(screen.getByRole("tab", { name: "7d" }));
    expect(riskRange?.textContent).toMatch(/75—89%/);
  });

  it("supports keyboard horizon navigation", () => {
    render(<WildfireDashboard />);
    const current = screen.getByRole("tab", { name: "24h" });

    current.focus();
    fireEvent.keyDown(current, { key: "ArrowRight" });

    const next = screen.getByRole("tab", { name: "48h" });
    expect(next.getAttribute("aria-selected")).toBe("true");
    expect(next.getAttribute("tabindex")).toBe("0");
    expect(current.getAttribute("tabindex")).toBe("-1");
    expect(next.getAttribute("aria-controls")).toBe("risk-horizon-panel");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
      "horizon-tab-48h",
    );
    expect(document.activeElement).toBe(next);
  });

  it("toggles every visual layer with pressed-state feedback", () => {
    render(<WildfireDashboard />);
    const layerNames = [
      "Wind field",
      "Temperature",
      "Soil moisture",
      "Vegetation dryness",
      "Detection sample fixture",
      "Forecast envelope",
      "Historical fire scars",
      "Assets at risk",
    ];

    for (const name of layerNames) {
      const button = screen.getByRole("button", { name: new RegExp(name, "i") });
      const before = button.getAttribute("aria-pressed");
      fireEvent.click(button);
      expect(button.getAttribute("aria-pressed")).not.toBe(before);
    }
  });

  it("opens methodology guidance and drives replay controls", () => {
    render(<WildfireDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Open information panel" }));
    expect(screen.getByRole("region", { name: "Replay methodology" })).toBeTruthy();
    expect(screen.getByText(/not connected to live alert feeds/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("region", { name: "Replay methodology" })).toBeNull();

    const play = screen.getByRole("button", { name: "Play story replay" });
    fireEvent.click(play);
    expect(screen.getByRole("button", { name: "Pause story replay" })).toBeTruthy();

    fireEvent.change(screen.getByRole("slider", { name: "Story replay time" }), {
      target: { value: "5" },
    });
    expect(screen.getByText(/ACTIVE FRONT · T\+30H/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play story replay" })).toBeTruthy();
  });

  it("switches theme accessibly and persists the choice", () => {
    const { container } = render(<WildfireDashboard />);
    const shell = container.querySelector(".app-shell");
    const switcher = screen.getByRole("button", { name: "Switch to light theme" });

    expect(shell?.getAttribute("data-theme")).toBe("dark");
    fireEvent.click(switcher);

    expect(shell?.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem("ember-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeTruthy();
  });

  it("switches between real historic activation examples and exposes provenance", () => {
    render(<WildfireDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /Valparaíso/i }));
    expect(screen.getByRole("heading", { name: "Valparaíso" })).toBeTruthy();
    expect(screen.getByText(/Viña del Mar, Chile/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sources" }));
    expect(
      screen.getByRole("dialog", {
        name: "Data provenance for EMSR715",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("EMSR715").length).toBeGreaterThan(0);
    expect(screen.getByText(/does not request a live fire service/i)).toBeTruthy();
  });

  it("manages focus and Escape for the provenance dialog", () => {
    render(<WildfireDashboard />);
    const trigger = screen.getByRole("button", { name: "Sources" });
    trigger.focus();
    fireEvent.click(trigger);

    const close = screen.getByRole("button", {
      name: "Close data provenance",
    });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getAllByRole("link").at(-1));

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("provides non-drag globe controls", () => {
    render(<WildfireDashboard />);

    for (const name of ["Zoom in", "Zoom out", "Focus", "Full Earth", "Reset"]) {
      const control = screen.getByRole("button", { name });
      expect(control).toBeTruthy();
      fireEvent.click(control);
    }
  });

  it("reclaims the inspector layout state without removing verification metrics", () => {
    const { container } = render(<WildfireDashboard />);
    const shell = container.querySelector(".atlas-shell");
    expect(shell?.classList.contains("inspector-open")).toBe(true);
    expect(screen.getByText(/0\.69 IoU/i)).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Close incident inspector" }),
    );
    expect(shell?.classList.contains("inspector-closed")).toBe(true);
    expect(screen.getByText(/0\.69 IoU/i)).toBeTruthy();
  });
});
