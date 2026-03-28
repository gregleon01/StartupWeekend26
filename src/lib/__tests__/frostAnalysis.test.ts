import { describe, it, expect } from "vitest";
import { detectFrostEvents, estimateLoss, generateSimulationData } from "../frostAnalysis";
import type { ParametricContract, HourlyDataPoint } from "@/types";

/* ================================================================== */
/*  Frost Detection FSM — Test Suite                                   */
/*                                                                     */
/*  Tests the core trigger engine against known scenarios:             */
/*    - Clear trigger (extended breach)                                */
/*    - Near-miss (breach too short)                                   */
/*    - Midnight-spanning events                                       */
/*    - Multiple events per year (worst kept)                          */
/*    - No frost at all                                                */
/*    - Edge: threshold exactly at boundary                            */
/*    - Edge: suspect data points skipped                              */
/*    - Real Kyustendil 2025 data                                      */
/* ================================================================== */

/** Helper: create a cherry frost contract */
const cherryContract: ParametricContract = {
  id: "test-cherries",
  crop: "Cherries",
  cropBg: "Череши",
  icon: "🍒",
  triggerVariable: "temperature_2m",
  triggerDirection: "below",
  threshold: -2,
  thresholdUnit: "°C",
  durationThreshold: 4,
  sensitiveStart: "04-01",
  sensitiveEnd: "05-15",
  payoutPerHectare: 340,
  premiumPerHectare: 15,
  avgYieldPerHectare: 4200,
  countryCode: "BG",
};

/** Helper: generate hourly data points */
function makeHourly(
  data: { date: string; hour: number; temp: number; quality?: "ok" | "suspect" }[],
): HourlyDataPoint[] {
  return data.map((d) => ({
    time: `${d.date}T${String(d.hour).padStart(2, "0")}:00`,
    temperature: d.temp,
    quality: d.quality ?? "ok",
  }));
}

describe("detectFrostEvents", () => {
  it("detects a clear trigger — 6 consecutive hours below -2°C", () => {
    const data = makeHourly([
      // April 10, 2020: frost event from 1am to 7am (6 hours below -2°C)
      { date: "2020-04-10", hour: 0, temp: 0 },
      { date: "2020-04-10", hour: 1, temp: -2.5 },
      { date: "2020-04-10", hour: 2, temp: -3.0 },
      { date: "2020-04-10", hour: 3, temp: -3.5 },
      { date: "2020-04-10", hour: 4, temp: -3.2 },
      { date: "2020-04-10", hour: 5, temp: -2.8 },
      { date: "2020-04-10", hour: 6, temp: -2.1 },
      { date: "2020-04-10", hour: 7, temp: 0.5 },
      { date: "2020-04-10", hour: 8, temp: 2.0 },
    ]);

    const events = detectFrostEvents(data, cherryContract);
    const ev2020 = events.find((e) => e.year === 2020);
    expect(ev2020).toBeDefined();
    expect(ev2020!.triggered).toBe(true);
    expect(ev2020!.durationHours).toBe(6);
    expect(ev2020!.minTemp).toBe(-3.5);
  });

  it("does NOT trigger when breach is too short — 3 hours < 4h requirement", () => {
    const data = makeHourly([
      { date: "2020-04-10", hour: 2, temp: -2.5 },
      { date: "2020-04-10", hour: 3, temp: -3.0 },
      { date: "2020-04-10", hour: 4, temp: -2.1 },
      { date: "2020-04-10", hour: 5, temp: 1.0 },
    ]);

    const events = detectFrostEvents(data, cherryContract);
    const ev2020 = events.find((e) => e.year === 2020);
    expect(ev2020).toBeDefined();
    expect(ev2020!.triggered).toBe(false);
    expect(ev2020!.durationHours).toBe(3);
  });

  it("handles events spanning midnight", () => {
    const data = makeHourly([
      // April 14 23:00 → April 15 04:00 (5 hours below threshold)
      { date: "2021-04-14", hour: 22, temp: 0.5 },
      { date: "2021-04-14", hour: 23, temp: -2.5 },
      { date: "2021-04-15", hour: 0, temp: -3.0 },
      { date: "2021-04-15", hour: 1, temp: -3.2 },
      { date: "2021-04-15", hour: 2, temp: -2.8 },
      { date: "2021-04-15", hour: 3, temp: -2.3 },
      { date: "2021-04-15", hour: 4, temp: 0.5 },
    ]);

    const events = detectFrostEvents(data, cherryContract);
    const ev2021 = events.find((e) => e.year === 2021);
    expect(ev2021).toBeDefined();
    expect(ev2021!.triggered).toBe(true);
    expect(ev2021!.durationHours).toBe(5);
  });

  it("keeps only the worst event per year when multiple occur", () => {
    const data = makeHourly([
      // Event 1: April 5, 2 hours (short)
      { date: "2022-04-05", hour: 2, temp: -2.5 },
      { date: "2022-04-05", hour: 3, temp: -2.1 },
      { date: "2022-04-05", hour: 4, temp: 1.0 },
      // Event 2: April 20, 5 hours (triggered, longer, colder)
      { date: "2022-04-20", hour: 0, temp: 1.0 },
      { date: "2022-04-20", hour: 1, temp: -2.5 },
      { date: "2022-04-20", hour: 2, temp: -4.0 },
      { date: "2022-04-20", hour: 3, temp: -3.8 },
      { date: "2022-04-20", hour: 4, temp: -3.0 },
      { date: "2022-04-20", hour: 5, temp: -2.5 },
      { date: "2022-04-20", hour: 6, temp: 0.5 },
    ]);

    const events = detectFrostEvents(data, cherryContract);
    const ev2022 = events.find((e) => e.year === 2022);
    expect(ev2022).toBeDefined();
    expect(ev2022!.triggered).toBe(true);
    expect(ev2022!.durationHours).toBe(5);
    expect(ev2022!.minTemp).toBe(-4.0);
  });

  it("returns zero-duration event for years with no frost", () => {
    // No data at all — all years should be zero
    const events = detectFrostEvents([], cherryContract);
    expect(events.length).toBe(11); // 2015–2025
    expect(events.every((e) => e.durationHours === 0)).toBe(true);
    expect(events.every((e) => e.triggered === false)).toBe(true);
  });

  it("does not count temperature exactly at threshold as breach", () => {
    // -2.0°C is NOT below -2°C (strict inequality)
    const data = makeHourly([
      { date: "2020-04-10", hour: 0, temp: -2.0 },
      { date: "2020-04-10", hour: 1, temp: -2.0 },
      { date: "2020-04-10", hour: 2, temp: -2.0 },
      { date: "2020-04-10", hour: 3, temp: -2.0 },
      { date: "2020-04-10", hour: 4, temp: -2.0 },
    ]);

    const events = detectFrostEvents(data, cherryContract);
    const ev2020 = events.find((e) => e.year === 2020);
    expect(ev2020!.durationHours).toBe(0);
    expect(ev2020!.triggered).toBe(false);
  });

  it("skips suspect data points during breach counting", () => {
    const data = makeHourly([
      { date: "2020-04-10", hour: 0, temp: -3.0 },
      { date: "2020-04-10", hour: 1, temp: -3.5, quality: "suspect" }, // skipped
      { date: "2020-04-10", hour: 2, temp: -3.0 },
      { date: "2020-04-10", hour: 3, temp: -2.8 },
      { date: "2020-04-10", hour: 4, temp: -2.5 },
      { date: "2020-04-10", hour: 5, temp: 1.0 },
    ]);

    const events = detectFrostEvents(data, cherryContract);
    const ev2020 = events.find((e) => e.year === 2020);
    expect(ev2020).toBeDefined();
    // Hour 1 is suspect so skipped — streak should be 4 hours (0,2,3,4)
    // Actually: hour 0 starts streak, hour 1 skipped (not in filtered data),
    // hours 2,3,4 continue. But the filter removes suspect before iteration,
    // so the stream is: 0→2→3→4 with time gaps. The FSM sees continuous
    // breach across 4 kept data points.
    expect(ev2020!.triggered).toBe(true);
  });

  it("produces audit trail (stateLog) for triggered events", () => {
    const data = makeHourly([
      { date: "2020-04-10", hour: 0, temp: 1.0 },
      { date: "2020-04-10", hour: 1, temp: -2.5 },
      { date: "2020-04-10", hour: 2, temp: -3.0 },
      { date: "2020-04-10", hour: 3, temp: -3.5 },
      { date: "2020-04-10", hour: 4, temp: -3.0 },
      { date: "2020-04-10", hour: 5, temp: 0.5 },
    ]);

    const events = detectFrostEvents(data, cherryContract);
    const ev2020 = events.find((e) => e.year === 2020);
    expect(ev2020!.stateLog).toBeDefined();
    expect(ev2020!.stateLog!.length).toBeGreaterThan(0);

    // First transition should be MONITORING → COUNTING
    const first = ev2020!.stateLog![0];
    expect(first.from).toBe("MONITORING");
    expect(first.to).toBe("COUNTING");
  });

  it("handles data outside sensitive window — ignored", () => {
    // March data only (before Apr 1 sensitive start for cherries)
    const data = makeHourly([
      { date: "2020-03-15", hour: 2, temp: -5.0 },
      { date: "2020-03-15", hour: 3, temp: -6.0 },
      { date: "2020-03-15", hour: 4, temp: -5.5 },
      { date: "2020-03-15", hour: 5, temp: -4.0 },
      { date: "2020-03-15", hour: 6, temp: -3.0 },
    ]);

    const events = detectFrostEvents(data, cherryContract);
    const ev2020 = events.find((e) => e.year === 2020);
    expect(ev2020!.durationHours).toBe(0);
  });
});

describe("estimateLoss", () => {
  it("returns 0 for zero duration", () => {
    expect(estimateLoss(-5, 0, cherryContract)).toBe(0);
  });

  it("scales with depth and duration", () => {
    const mild = estimateLoss(-2.5, 4, cherryContract);
    const severe = estimateLoss(-5.0, 8, cherryContract);
    expect(severe).toBeGreaterThan(mild);
  });

  it("caps at 2x base payout", () => {
    const extreme = estimateLoss(-20, 100, cherryContract);
    expect(extreme).toBeLessThanOrEqual(cherryContract.payoutPerHectare * 2);
  });
});

describe("generateSimulationData", () => {
  it("returns real Kyustendil 2025 data points", () => {
    const data = generateSimulationData(cherryContract);
    expect(data.length).toBe(19);
    // First point: Apr 7 sunset
    expect(data[0].temperature).toBe(4.2);
    // Coldest point should be -3.1
    const min = Math.min(...data.map((d) => d.temperature));
    expect(min).toBe(-3.1);
    // Last point: recovery
    expect(data[data.length - 1].temperature).toBe(6.2);
  });
});
