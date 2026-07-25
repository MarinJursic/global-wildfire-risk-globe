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
    expect(document.activeElement).toBe(next);
  });

  it("toggles every visual layer with pressed-state feedback", () => {
    render(<WildfireDashboard />);
    const layerNames = [
      "Wind field",
      "Temperature",
      "Soil moisture",
      "Vegetation dryness",
      "VIIRS detections",
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
});
