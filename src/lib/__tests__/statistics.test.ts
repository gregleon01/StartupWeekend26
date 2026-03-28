import { describe, it, expect } from "vitest";
import { linearRegression, analyzeTrend } from "../statistics";
import type { FrostEvent } from "@/types";

describe("linearRegression", () => {
  it("returns zero slope for constant data", () => {
    const points = [{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }];
    const { slope } = linearRegression(points);
    expect(slope).toBe(0);
  });

  it("returns correct slope for perfect linear data", () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }];
    const { slope, intercept, rSquared } = linearRegression(points);
    expect(slope).toBe(2);
    expect(intercept).toBe(0);
    expect(rSquared).toBe(1);
  });

  it("handles single point gracefully", () => {
    const { slope } = linearRegression([{ x: 1, y: 1 }]);
    expect(slope).toBe(0);
  });

  it("handles empty array", () => {
    const { slope } = linearRegression([]);
    expect(slope).toBe(0);
  });
});

describe("analyzeTrend", () => {
  it("detects increasing trend", () => {
    const events: FrostEvent[] = [];
    // More frost events in later years
    for (let y = 2015; y <= 2025; y++) {
      const count = y >= 2021 ? 1 : 0;
      for (let i = 0; i < Math.max(count, 1); i++) {
        events.push({
          date: `${y}-04-10`,
          minTemp: count > 0 ? -3 : 2,
          durationHours: count > 0 ? 5 : 0,
          triggered: count > 0,
          estimatedLoss: count > 0 ? 200 : 0,
          year: y,
        });
      }
    }
    const trend = analyzeTrend(events);
    expect(trend.slope).toBeGreaterThan(0);
    expect(trend.description).toContain("increased");
  });

  it("returns stable for flat data", () => {
    const events: FrostEvent[] = [];
    for (let y = 2015; y <= 2025; y++) {
      events.push({
        date: `${y}-04-10`,
        minTemp: 2,
        durationHours: 0,
        triggered: false,
        estimatedLoss: 0,
        year: y,
      });
    }
    const trend = analyzeTrend(events);
    expect(Math.abs(trend.slope)).toBeLessThan(0.02);
    expect(trend.description).toContain("stable");
  });

  it("handles empty events", () => {
    const trend = analyzeTrend([]);
    expect(trend.dataPoints.length).toBe(11);
    expect(trend.slope).toBe(0);
  });
});
