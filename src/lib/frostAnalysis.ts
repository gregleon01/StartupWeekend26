import type { FrostEvent, HourlyDataPoint, ParametricContract } from "@/types";

/**
 * Core frost detection engine.
 *
 * Scans hourly temperature data for continuous periods where temperature
 * stays below the contract's threshold during the sensitive crop window.
 * Returns one FrostEvent per detected cold spell, marked as triggered
 * if the spell duration exceeds the contract's duration threshold.
 *
 * Algorithm:
 * 1. Filter data to the sensitive window for each year present
 * 2. Walk hours sequentially, tracking consecutive sub-threshold streaks
 * 3. When a streak breaks (temp rises) or data ends, emit the event
 * 4. Keep only the worst event per year (longest / coldest)
 */
export function detectFrostEvents(
  hourlyData: HourlyDataPoint[],
  contract: ParametricContract,
): FrostEvent[] {
  const yearEvents = new Map<number, FrostEvent>();

  // Parse MM-DD boundaries
  const [startMonth, startDay] = contract.sensitiveStart.split("-").map(Number);
  const [endMonth, endDay] = contract.sensitiveEnd.split("-").map(Number);

  // Filter to sensitive window
  const sensitive = hourlyData.filter((d) => {
    const date = new Date(d.time);
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const afterStart = m > startMonth || (m === startMonth && day >= startDay);
    const beforeEnd = m < endMonth || (m === endMonth && day <= endDay);
    return afterStart && beforeEnd;
  });

  // Walk through hours, tracking breaches
  let streakStart = "";
  let streakMin = Infinity;
  let streakHours = 0;
  let streakYear = 0;

  const closeStreak = () => {
    if (streakHours === 0) return;

    const triggered = streakHours >= contract.durationThreshold;
    const loss = estimateLoss(streakMin, streakHours, contract);
    const event: FrostEvent = {
      date: streakStart,
      minTemp: streakMin,
      durationHours: streakHours,
      triggered,
      estimatedLoss: loss,
      year: streakYear,
    };

    // Keep worst event per year (prefer triggered, then longest duration)
    const existing = yearEvents.get(streakYear);
    if (
      !existing ||
      (event.triggered && !existing.triggered) ||
      (event.triggered === existing.triggered &&
        event.durationHours > existing.durationHours)
    ) {
      yearEvents.set(streakYear, event);
    }

    // Reset
    streakHours = 0;
    streakMin = Infinity;
    streakStart = "";
  };

  for (const point of sensitive) {
    const year = new Date(point.time).getFullYear();

    // If we crossed into a new year, close any open streak
    if (year !== streakYear && streakHours > 0) {
      closeStreak();
    }

    if (point.temperature < contract.temperatureThreshold) {
      // Below threshold — extend or start streak
      if (streakHours === 0) {
        streakStart = point.time;
        streakYear = year;
      }
      streakHours++;
      streakMin = Math.min(streakMin, point.temperature);
    } else {
      // Above threshold — close any open streak
      closeStreak();
      streakYear = year;
    }
  }

  // Close final streak if data ends mid-breach
  closeStreak();

  // Return sorted by year, filling gaps with non-events
  const events: FrostEvent[] = [];
  for (let y = 2015; y <= 2025; y++) {
    const ev = yearEvents.get(y);
    if (ev) {
      events.push(ev);
    } else {
      events.push({
        date: `${y}-${contract.sensitiveStart}`,
        minTemp: contract.temperatureThreshold + 3,
        durationHours: 0,
        triggered: false,
        estimatedLoss: 0,
        year: y,
      });
    }
  }

  return events;
}

/**
 * Estimates financial loss severity based on depth and duration of frost.
 * Model: base payout * severity multiplier, where severity factors in
 * how far below threshold and how long. Capped at 2x base payout.
 */
export function estimateLoss(
  minTemp: number,
  durationHours: number,
  contract: ParametricContract,
): number {
  if (durationHours === 0) return 0;

  const depthBelow = Math.abs(
    minTemp - contract.temperatureThreshold,
  );
  const depthFactor = Math.min(depthBelow / 3, 1.5); // 3°C below = 1.0x
  const durationFactor = Math.min(
    durationHours / contract.durationThreshold,
    2,
  ); // 2x threshold hours = 2.0x
  const severity = (depthFactor + durationFactor) / 2;
  const loss = contract.payoutPerHectare * severity;

  // Cap at 2x base payout
  return Math.round(Math.min(loss, contract.payoutPerHectare * 2));
}

/**
 * Generates a synthetic frost data sequence for the simulation.
 * Produces ~16 hours of hourly data: cooling → breach → recovery.
 */
export function generateSimulationData(
  contract: ParametricContract,
): { time: string; temperature: number }[] {
  const points: { time: string; temperature: number }[] = [];
  const threshold = contract.temperatureThreshold;
  const base = new Date();
  base.setMonth(3); // April
  base.setDate(14);
  base.setHours(20, 0, 0, 0);

  // Phase: evening cooling (4h, +4°C → threshold)
  for (let h = 0; h < 4; h++) {
    const t = new Date(base.getTime() + h * 3600_000);
    const temp = 4 - ((4 - threshold) * h) / 4;
    points.push({ time: t.toISOString(), temperature: +temp.toFixed(1) });
  }

  // Phase: below threshold (breach, 8h with sinusoidal dip)
  const deepest = threshold - 2.5;
  for (let h = 0; h < 8; h++) {
    const t = new Date(base.getTime() + (4 + h) * 3600_000);
    const progress = h / 8;
    const temp =
      threshold + (deepest - threshold) * Math.sin(progress * Math.PI);
    points.push({ time: t.toISOString(), temperature: +temp.toFixed(1) });
  }

  // Phase: recovery (4h, threshold → +5°C)
  for (let h = 0; h < 4; h++) {
    const t = new Date(base.getTime() + (12 + h) * 3600_000);
    const temp = threshold + ((5 - threshold) * (h + 1)) / 4;
    points.push({ time: t.toISOString(), temperature: +temp.toFixed(1) });
  }

  return points;
}
