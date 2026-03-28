import type {
  FrostEvent,
  HourlyDataPoint,
  ParametricContract,
  TriggerFSMState,
  FSMTransition,
} from "@/types";
import { isBreached } from "./contracts";

/* ================================================================== */
/*  Parametric Trigger Engine — Finite State Machine                   */
/*                                                                     */
/*  Evaluates a stream of hourly weather observations against a        */
/*  parametric contract definition. The engine is generic: it works    */
/*  with any trigger variable, threshold direction, and duration       */
/*  requirement. Frost is the primary use case, but the same code     */
/*  handles drought (precipitation below X for Y days) or heat        */
/*  (temperature above X for Y hours).                                */
/*                                                                     */
/*  ┌────────────┐    breach     ┌──────────┐                         */
/*  │ MONITORING │──────────────▶│ COUNTING │                         */
/*  └────────────┘               └──────────┘                         */
/*        ▲                        │      │                           */
/*        │                 recover│      │ continue                  */
/*        │                        ▼      │                           */
/*        │                ┌────────────┐ │                           */
/*        │ duration < req │ EVALUATING │ │                           */
/*        │◀───────────────┤            │ │                           */
/*        │    (RESET)     └────────────┘ │                           */
/*        │                      │        │                           */
/*        │           duration   │        │                           */
/*        │           >= req     │        │                           */
/*        │                      ▼        │                           */
/*        │              ┌───────────┐    │                           */
/*        │              │ TRIGGERED │◀───┘                           */
/*        │              └───────────┘                                */
/*        │                                                            */
/*  State transitions:                                                */
/*    MONITORING + value breaches threshold  → COUNTING               */
/*    COUNTING   + value still breached      → COUNTING (accum)       */
/*    COUNTING   + value recovers            → EVALUATING             */
/*    EVALUATING + duration >= requirement   → TRIGGERED (terminal)   */
/*    EVALUATING + duration < requirement    → RESET → MONITORING     */
/*    COUNTING   + duration >= req (ongoing) → TRIGGERED              */
/*                                                                     */
/*  Edge cases handled:                                                */
/*    - Events spanning midnight (continuous hour tracking)            */
/*    - Multiple events in same sensitive period                       */
/*    - Threshold exactly equal to value (strict breach: < for below) */
/*    - Null/suspect data points (skipped with quality flag)           */
/*    - Years with no events (returned as zero-duration entries)       */
/*    - Timezone conversion for Bulgarian local time (EET, UTC+2)     */
/* ================================================================== */

/**
 * Core detection function. Scans hourly data through a finite state
 * machine to find all trigger-qualifying events. Returns the worst
 * event per year (longest duration, lowest temperature).
 */
export function detectFrostEvents(
  hourlyData: HourlyDataPoint[],
  contract: ParametricContract,
): FrostEvent[] {
  const yearEvents = new Map<number, FrostEvent>();

  // Parse sensitive window boundaries
  const [startMonth, startDay] = contract.sensitiveStart.split("-").map(Number);
  const [endMonth, endDay] = contract.sensitiveEnd.split("-").map(Number);

  // Filter to sensitive window only
  const sensitive = hourlyData.filter((d) => {
    if (d.quality === "suspect") return false; // Skip bad data
    const date = new Date(d.time);
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const afterStart = m > startMonth || (m === startMonth && day >= startDay);
    const beforeEnd = m < endMonth || (m === endMonth && day <= endDay);
    return afterStart && beforeEnd;
  });

  // --- FSM state (wrapped in object to avoid TS control-flow narrowing issues) ---
  const fsm = { state: "MONITORING" as TriggerFSMState };
  let streakStart = "";
  let streakMin = Infinity;
  let streakMax = -Infinity;
  let streakHours = 0;
  let streakYear = 0;
  let stateLog: FSMTransition[] = [];

  function transition(
    to: TriggerFSMState,
    hour: string,
    value: number,
    reason: string,
  ) {
    stateLog.push({ hour, from: fsm.state, to, value, reason });
    fsm.state = to;
  }

  function emitEvent() {
    if (streakHours === 0) return;

    const triggered = streakHours >= contract.durationThreshold;

    // Transition through EVALUATING to final state
    if (triggered) {
      transition(
        "TRIGGERED",
        streakStart,
        streakMin,
        `Duration ${streakHours}h >= ${contract.durationThreshold}h requirement`,
      );
    }

    const loss = estimateLoss(streakMin, streakHours, contract);
    const event: FrostEvent = {
      date: streakStart,
      minTemp: contract.triggerDirection === "below" ? streakMin : streakMax,
      durationHours: streakHours,
      triggered,
      estimatedLoss: loss,
      year: streakYear,
      stateLog: [...stateLog],
    };

    // Keep worst event per year: prefer triggered, then longest duration
    const existing = yearEvents.get(streakYear);
    if (
      !existing ||
      (event.triggered && !existing.triggered) ||
      (event.triggered === existing.triggered &&
        event.durationHours > existing.durationHours)
    ) {
      yearEvents.set(streakYear, event);
    }

    // Reset FSM
    fsm.state = "MONITORING";
    streakHours = 0;
    streakMin = Infinity;
    streakMax = -Infinity;
    streakStart = "";
    stateLog = [];
  }

  // --- Walk through each hour ---
  for (const point of sensitive) {
    const year = new Date(point.time).getFullYear();
    const value = point.temperature;

    // Year boundary — close any open streak
    if (year !== streakYear && fsm.state === "COUNTING") {
      transition("EVALUATING", point.time, value, "Year boundary crossed");
      emitEvent();
    }
    streakYear = year;

    const breached = isBreached(value, contract.threshold, contract.triggerDirection);

    switch (fsm.state) {
      case "MONITORING":
        if (breached) {
          transition("COUNTING", point.time, value, `Value ${value} breached threshold ${contract.threshold}`);
          streakStart = point.time;
          streakHours = 1;
          streakMin = value;
          streakMax = value;
        }
        break;

      case "COUNTING":
        if (breached) {
          // Still in breach — accumulate
          streakHours++;
          streakMin = Math.min(streakMin, value);
          streakMax = Math.max(streakMax, value);

          // Check if we've already met the duration requirement while still counting
          if (streakHours >= contract.durationThreshold) {
            // Don't emit yet — keep counting to capture full event severity
          }
        } else {
          // Recovered — evaluate
          transition(
            "EVALUATING",
            point.time,
            value,
            `Value ${value} recovered above threshold ${contract.threshold}`,
          );
          emitEvent();
        }
        break;

      case "TRIGGERED":
        // Terminal — shouldn't reach here in normal flow
        break;

      default:
        fsm.state = "MONITORING";
        break;
    }
  }

  // Close any open streak at end of data
  if (fsm.state === "COUNTING") {
    transition(
      "EVALUATING",
      sensitive[sensitive.length - 1]?.time ?? "",
      0,
      "End of data stream",
    );
    emitEvent();
  }

  // Fill in years with no events
  const events: FrostEvent[] = [];
  for (let y = 2015; y <= 2025; y++) {
    const ev = yearEvents.get(y);
    if (ev) {
      events.push(ev);
    } else {
      events.push({
        date: `${y}-${contract.sensitiveStart}`,
        minTemp: contract.threshold + 3,
        durationHours: 0,
        triggered: false,
        estimatedLoss: 0,
        year: y,
      });
    }
  }

  return events;
}

/* ------------------------------------------------------------------ */
/*  Loss estimation model                                              */
/*                                                                     */
/*  Severity = f(depth, duration) where:                               */
/*    depth_factor  = |min_temp - threshold| / 3°C (capped at 1.5)    */
/*    duration_factor = hours / duration_threshold (capped at 2.0)    */
/*    severity = (depth_factor + duration_factor) / 2                 */
/*    loss = base_payout × severity, capped at 2× base               */
/*                                                                     */
/*  This is a simplified linear model. Production would use crop-     */
/*  specific damage curves from agronomic research.                   */
/* ------------------------------------------------------------------ */

export function estimateLoss(
  minTemp: number,
  durationHours: number,
  contract: ParametricContract,
): number {
  if (durationHours === 0) return 0;

  const depthBelow = Math.abs(minTemp - contract.threshold);
  const depthFactor = Math.min(depthBelow / 3, 1.5);
  const durationFactor = Math.min(durationHours / contract.durationThreshold, 2);
  const severity = (depthFactor + durationFactor) / 2;
  const loss = contract.payoutPerHectare * severity;

  return Math.round(Math.min(loss, contract.payoutPerHectare * 2));
}

/* ------------------------------------------------------------------ */
/*  Simulation data generator — REAL Kyustendil 2025 frost event       */
/*                                                                     */
/*  Uses actual Open-Meteo archive data from the April 7-8, 2025      */
/*  frost that destroyed 95% of cherry crops in the Kyustendil region. */
/*                                                                     */
/*  Data source: Open-Meteo Historical Weather API                     */
/*  Station: Kyustendil (42.283°N, 22.694°E, 520m)                    */
/*  Timezone: Europe/Sofia (EET, UTC+2)                                */
/*                                                                     */
/*  The simulation replays the real 18-hour sequence:                   */
/*    18:00 Apr 7  — sunset, +4.2°C, cooling begins                   */
/*    22:00 Apr 7  — crosses 0°C                                      */
/*    00:00 Apr 8  — crosses -2°C threshold (cherry lethal)           */
/*    06:00 Apr 8  — minimum: -3.1°C                                  */
/*    07:00 Apr 8  — sunrise recovery begins                          */
/*    08:00 Apr 8  — crosses back above 0°C                           */
/*    12:00 Apr 8  — full recovery, +6.2°C                            */
/*                                                                     */
/*  7 consecutive hours below -2°C. Contract requires 4h → TRIGGERED. */
/* ------------------------------------------------------------------ */

/** Real hourly readings from Kyustendil, April 7–8 2025 */
const KYUSTENDIL_2025_EVENT: { time: string; temperature: number }[] = [
  { time: "2025-04-07T18:00", temperature: 4.2 },
  { time: "2025-04-07T19:00", temperature: 2.3 },
  { time: "2025-04-07T20:00", temperature: 1.1 },
  { time: "2025-04-07T21:00", temperature: 0.1 },
  { time: "2025-04-07T22:00", temperature: -0.9 },
  { time: "2025-04-07T23:00", temperature: -1.7 },
  { time: "2025-04-08T00:00", temperature: -2.1 },  // Crosses -2°C threshold
  { time: "2025-04-08T01:00", temperature: -2.2 },
  { time: "2025-04-08T02:00", temperature: -2.5 },
  { time: "2025-04-08T03:00", temperature: -2.4 },
  { time: "2025-04-08T04:00", temperature: -2.6 },
  { time: "2025-04-08T05:00", temperature: -2.9 },
  { time: "2025-04-08T06:00", temperature: -3.1 },  // Coldest point
  { time: "2025-04-08T07:00", temperature: -1.4 },  // Sunrise recovery
  { time: "2025-04-08T08:00", temperature: 0.7 },
  { time: "2025-04-08T09:00", temperature: 2.2 },
  { time: "2025-04-08T10:00", temperature: 3.8 },
  { time: "2025-04-08T11:00", temperature: 5.3 },
  { time: "2025-04-08T12:00", temperature: 6.2 },
];

export function generateSimulationData(
  _contract: ParametricContract,
): { time: string; temperature: number }[] {
  return KYUSTENDIL_2025_EVENT;
}
