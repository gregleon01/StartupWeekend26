"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import type { ParametricContract } from "@/types";
import { generateSimulationData } from "@/lib/frostAnalysis";
import { useLocale } from "@/lib/i18n";
import PayoutNotification from "./PayoutNotification";

interface FrostSimulationProps {
  contract: ParametricContract;
  onExit: () => void;
  locationLabel?: string;
}

type Phase = "MONITORING" | "COUNTING" | "TRIGGERED";

/** Arc gauge — half-circle speedometer */
function TempGauge({
  temperature,
  threshold,
  minRange = -8,
  maxRange = 6,
}: {
  temperature: number;
  threshold: number;
  minRange?: number;
  maxRange?: number;
}) {
  const cx = 120;
  const cy = 110;
  const r = 88;
  // Arc goes from 210° to 330° (left to right, bottom-anchored half circle)
  const startAngle = 210;
  const endAngle = 330;
  const totalDeg = endAngle - startAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPoint = (deg: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });

  const tempToAngle = (t: number) => {
    const pct = (t - minRange) / (maxRange - minRange);
    return startAngle + pct * totalDeg;
  };

  const threshAngle = tempToAngle(threshold);
  const needleAngle = tempToAngle(Math.max(minRange, Math.min(maxRange, temperature)));

  // Build arc path segment
  const arcPath = (fromDeg: number, toDeg: number, radius: number) => {
    const s = arcPoint(fromDeg);
    // need to recalc with given radius
    const p1 = {
      x: cx + radius * Math.cos(toRad(fromDeg)),
      y: cy + radius * Math.sin(toRad(fromDeg)),
    };
    const p2 = {
      x: cx + radius * Math.cos(toRad(toDeg)),
      y: cy + radius * Math.sin(toRad(toDeg)),
    };
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${large} 1 ${p2.x} ${p2.y}`;
    void s;
  };

  // Needle tip
  const needleTip = {
    x: cx + (r - 10) * Math.cos(toRad(needleAngle)),
    y: cy + (r - 10) * Math.sin(toRad(needleAngle)),
  };
  const needleBase1 = {
    x: cx + 7 * Math.cos(toRad(needleAngle + 90)),
    y: cy + 7 * Math.sin(toRad(needleAngle + 90)),
  };
  const needleBase2 = {
    x: cx + 7 * Math.cos(toRad(needleAngle - 90)),
    y: cy + 7 * Math.sin(toRad(needleAngle - 90)),
  };

  // Threshold tick
  const threshIn = {
    x: cx + (r - 16) * Math.cos(toRad(threshAngle)),
    y: cy + (r - 16) * Math.sin(toRad(threshAngle)),
  };
  const threshOut = {
    x: cx + (r + 6) * Math.cos(toRad(threshAngle)),
    y: cy + (r + 6) * Math.sin(toRad(threshAngle)),
  };

  const belowThreshold = temperature < threshold;

  return (
    <svg viewBox="0 0 240 130" className="w-full" style={{ maxHeight: 160 }}>
      <defs>
        <linearGradient id="arcGrad" gradientUnits="userSpaceOnUse"
          x1={arcPoint(startAngle).x} y1={arcPoint(startAngle).y}
          x2={arcPoint(endAngle).x} y2={arcPoint(endAngle).y}>
          <stop offset="0%" stopColor="#EF5350" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#4FC3F7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
        </linearGradient>
        <filter id="needleGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background arc track */}
      <path d={arcPath(startAngle, endAngle, r)}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" strokeLinecap="round" />

      {/* Danger zone arc (startAngle → threshAngle) */}
      <path d={arcPath(startAngle, threshAngle, r)}
        fill="none" stroke="rgba(239,83,80,0.35)" strokeWidth="12" strokeLinecap="round" />

      {/* Safe zone arc (threshAngle → endAngle) */}
      <path d={arcPath(threshAngle, endAngle, r)}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />

      {/* Active filled arc (startAngle → needleAngle) when below threshold */}
      {belowThreshold && (
        <path d={arcPath(startAngle, Math.min(needleAngle, threshAngle), r)}
          fill="none" stroke="#EF5350" strokeWidth="12"
          strokeLinecap="round" opacity="0.7" />
      )}

      {/* Threshold tick */}
      <line x1={threshIn.x} y1={threshIn.y} x2={threshOut.x} y2={threshOut.y}
        stroke="#EF5350" strokeWidth="2" opacity="0.9" />

      {/* Threshold label */}
      <text
        x={cx + (r + 18) * Math.cos(toRad(threshAngle))}
        y={cy + (r + 18) * Math.sin(toRad(threshAngle)) + 3}
        textAnchor="middle" fontSize="7" fill="rgba(239,83,80,0.8)" fontFamily="monospace">
        {threshold}°
      </text>

      {/* Range labels */}
      <text x={arcPoint(startAngle).x - 4} y={arcPoint(startAngle).y + 10}
        textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.25)" fontFamily="monospace">
        {minRange}°
      </text>
      <text x={arcPoint(endAngle).x + 4} y={arcPoint(endAngle).y + 10}
        textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.25)" fontFamily="monospace">
        +{maxRange}°
      </text>

      {/* Needle */}
      <motion.polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
        fill={belowThreshold ? "#EF5350" : "rgba(255,255,255,0.85)"}
        filter="url(#needleGlow)"
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      {/* Needle pivot */}
      <circle cx={cx} cy={cy} r={5}
        fill={belowThreshold ? "#EF5350" : "rgba(255,255,255,0.6)"} />

      {/* Temperature number inside arc */}
      <motion.text
        x={cx} y={cy - 22}
        textAnchor="middle" fontSize="28" fontWeight="800"
        fill={belowThreshold ? "#EF5350" : "white"}
        fontFamily="monospace"
        key={temperature.toFixed(1)}
      >
        {temperature.toFixed(1)}°C
      </motion.text>
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="7.5"
        fill="rgba(255,255,255,0.3)" fontFamily="sans-serif" letterSpacing="2">
        CURRENT TEMP
      </text>
    </svg>
  );
}

/** Phase badge */
function PhaseBadge({ phase, breachHours, durationThreshold }: {
  phase: Phase;
  breachHours: number;
  durationThreshold: number;
}) {
  if (phase === "TRIGGERED") {
    return (
      <motion.div
        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full
                   bg-accent-amber/15 border border-accent-amber/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        <span className="text-accent-amber text-sm font-bold tracking-wide">💰 PAYOUT TRIGGERED</span>
      </motion.div>
    );
  }

  if (phase === "COUNTING") {
    return (
      <motion.div
        className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full
                   bg-frost-blue/10 border border-frost-blue/30 shadow-[0_0_16px_rgba(79,195,247,0.2)]"
        animate={{ boxShadow: ["0 0 16px rgba(79,195,247,0.2)", "0 0 28px rgba(79,195,247,0.4)", "0 0 16px rgba(79,195,247,0.2)"] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <motion.div
          className="w-2 h-2 rounded-full bg-frost-blue"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="text-frost-blue text-sm font-bold tracking-wide">
          COUNTING · {breachHours}h / {durationThreshold}h
        </span>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full
                    bg-white/5 border border-white/10">
      <div className="w-2 h-2 rounded-full bg-white/30" />
      <span className="text-white/40 text-sm tracking-wide">MONITORING</span>
    </div>
  );
}

export default function FrostSimulation({
  contract,
  onExit,
  locationLabel = "Kyustendil",
}: FrostSimulationProps) {
  const { t } = useLocale();

  // Single phase state machine
  const [phase, setPhase] = useState<Phase>("MONITORING");
  const [temperature, setTemperature] = useState(4.2);
  const [simTime, setSimTime] = useState("Apr 7 · 18:00");
  const [progress, setProgress] = useState(0);
  const [minTemp, setMinTemp] = useState(4.2);
  const [breachHours, setBreachHours] = useState(0);
  const [showPayout, setShowPayout] = useState(false);
  const [shockwave, setShockwave] = useState(false);

  // Mutable counters in refs — never cause re-renders or stale closures
  const hoursBelow = useRef(0);
  const triggered = useRef(false);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  const data = useRef(generateSimulationData(contract));
  const total = data.current.length;

  useEffect(() => {
    const ids = timeoutIds.current;
    data.current.forEach((point, idx) => {
      const id = setTimeout(() => {
        const temp = point.temperature;
        const d = new Date(point.time);
        const label =
          d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
          " · " +
          d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

        setTemperature(temp);
        setSimTime(label);
        setProgress((idx + 1) / total);
        setMinTemp((prev) => Math.min(prev, temp));

        if (temp < contract.threshold && !triggered.current) {
          hoursBelow.current += 1;
          setBreachHours(hoursBelow.current);
          setPhase("COUNTING");

          if (hoursBelow.current >= contract.durationThreshold) {
            triggered.current = true;
            setPhase("TRIGGERED");
            setShockwave(true);
            setTimeout(() => setShockwave(false), 1200);
          }
        }

        if (idx === total - 1) {
          const finalId = setTimeout(() => setShowPayout(true), 700);
          ids.push(finalId);
        }
      }, 600 + idx * 280);
      ids.push(id);
    });

    return () => ids.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardBorder =
    phase === "TRIGGERED"
      ? "border-accent-amber/40 shadow-[0_0_40px_rgba(245,158,11,0.15)]"
      : phase === "COUNTING"
        ? "border-frost-blue/30 shadow-[0_0_30px_rgba(79,195,247,0.12)]"
        : "border-white/10";

  // Timeline: first time = 18:00, last = 12:00 next day (18 hours)
  const startHour = 18;
  const totalHours = total - 1;
  const currentHour = Math.round(progress * totalHours);
  const fmtHour = (offset: number) => {
    const h = (startHour + offset) % 24;
    return `${String(h).padStart(2, "0")}:00`;
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      {/* Map dim */}
      <motion.div
        className="absolute inset-0 bg-black/65"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* Frost vignette — bleeds in when counting */}
      <AnimatePresence>
        {phase !== "MONITORING" && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, rgba(79,195,247,0.12) 100%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "TRIGGERED" ? 1.8 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          />
        )}
      </AnimatePresence>

      {/* Shockwave ring on trigger */}
      <AnimatePresence>
        {shockwave && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-full border border-accent-amber/60"
              initial={{ width: 80, height: 80, opacity: 0.8 }}
              animate={{ width: 600, height: 600, opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-50 flex items-center gap-1.5 px-4 py-2
                   bg-white/8 backdrop-blur-xl border border-white/12 rounded-full
                   text-white/60 text-xs hover:text-white hover:bg-white/14
                   transition-all cursor-pointer pointer-events-auto"
      >
        <X className="w-3 h-3" />
        {t("sim.exit")}
      </button>

      {/* Title chip */}
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="px-5 py-2 bg-white/8 backdrop-blur-xl border border-white/12 rounded-full">
          <p className="text-white text-sm font-medium whitespace-nowrap">
            Frost Event Simulation · {locationLabel}, April 2025
          </p>
        </div>
      </motion.div>

      {/* Main card */}
      <AnimatePresence>
        {!showPayout && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35 }}
          >
            <div className={`w-full max-w-[480px] bg-white/8 backdrop-blur-2xl border rounded-3xl overflow-hidden transition-all duration-700 ${cardBorder}`}>

              {/* Zone 1 — Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{contract.icon}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{contract.crop}</p>
                    <p className="text-white/35 text-[10px] uppercase tracking-widest">Spring Frost Watch</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/60 font-mono text-xs">{simTime}</p>
                  <p className="text-white/25 text-[9px] uppercase tracking-widest mt-0.5">Local Time</p>
                </div>
              </div>

              {/* Zone 2 — Arc Gauge */}
              <div className="px-4 pt-3 pb-0">
                <TempGauge
                  temperature={temperature}
                  threshold={contract.threshold}
                />
              </div>

              {/* Zone 3 — Phase badge */}
              <div className="px-5 pb-4">
                <PhaseBadge
                  phase={phase}
                  breachHours={breachHours}
                  durationThreshold={contract.durationThreshold}
                />
              </div>

              {/* Zone 4 — Stats row */}
              <div className="grid grid-cols-3 border-t border-white/8">
                <div className="px-4 py-3 border-r border-white/8">
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">Lowest Temp</p>
                  <p className={`font-mono text-base font-bold ${minTemp < contract.threshold ? "text-danger-red" : "text-white"}`}>
                    {minTemp.toFixed(1)}°C
                  </p>
                </div>
                <div className="px-4 py-3 border-r border-white/8">
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">Hours Below</p>
                  <p className={`font-mono text-base font-bold ${phase === "COUNTING" ? "text-frost-blue" : phase === "TRIGGERED" ? "text-accent-amber" : "text-white/40"}`}>
                    {breachHours}h
                    <span className="text-white/25 font-normal text-sm"> / {contract.durationThreshold}h</span>
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">At Risk</p>
                  <p className={`font-mono text-base font-bold ${phase === "TRIGGERED" ? "text-accent-amber" : "text-white/70"}`}>
                    €{contract.payoutPerHectare.toLocaleString()}
                    <span className="text-white/25 font-normal text-xs">/ha</span>
                  </p>
                </div>
              </div>

              {/* Zone 5 — Timeline bar */}
              <div className="px-5 py-3 border-t border-white/8">
                <div className="relative h-1.5 bg-white/6 rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    className={`h-full rounded-full ${phase === "TRIGGERED" ? "bg-accent-amber" : phase === "COUNTING" ? "bg-frost-blue" : "bg-white/30"}`}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-white/25 text-[9px] font-mono">{fmtHour(0)}</span>
                  <span className="text-white/40 text-[9px] font-mono">{fmtHour(currentHour)}</span>
                  <span className="text-white/25 text-[9px] font-mono">{fmtHour(totalHours)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payout receipt */}
      <AnimatePresence>
        {showPayout && (
          <PayoutNotification
            contract={contract}
            minTemp={minTemp}
            breachHours={breachHours}
            locationLabel={`${locationLabel}, BG`}
          />
        )}
      </AnimatePresence>

      {/* Restart / Insure buttons */}
      <AnimatePresence>
        {showPayout && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-3 pointer-events-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5 }}
          >
            <button
              onClick={onExit}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/8 backdrop-blur-xl
                         border border-white/12 rounded-full text-white/70 text-sm
                         hover:text-white hover:bg-white/14 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("sim.restart")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
