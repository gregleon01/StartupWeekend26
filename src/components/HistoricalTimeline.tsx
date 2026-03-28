"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { FrostEvent, ParametricContract } from "@/types";
import { analyzeTrend } from "@/lib/statistics";

interface HistoricalTimelineProps {
  events: FrostEvent[];
  contract: ParametricContract;
  loading: boolean;
  onSeeCoverage: () => void;
}

function useCountUp(target: number, delay: number = 0) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const duration = 1000;
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame.current); };
  }, [target, delay]);
  return value;
}

function FrostLineChart({
  events,
  contract,
  onHover,
}: {
  events: FrostEvent[];
  contract: ParametricContract;
  onHover: (event: FrostEvent | null) => void;
}) {
  const W = 320;
  const H = 160;
  const padL = 32;
  const padR = 8;
  const padT = 10;
  const padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const safeTemp = contract.threshold + 4;
  const plotData = events.map((e) => ({
    year: e.year,
    temp: e.durationHours > 0 ? e.minTemp : safeTemp,
    triggered: e.triggered,
    hasEvent: e.durationHours > 0,
    event: e,
  }));

  const allTemps = plotData.map((d) => d.temp);
  const yMin = Math.min(...allTemps, contract.threshold) - 1.5;
  const yMax = Math.max(...allTemps, contract.threshold + 3) + 0.5;

  const xScale = (i: number) => padL + (i / (events.length - 1)) * chartW;
  const yScale = (t: number) => padT + ((yMax - t) / (yMax - yMin)) * chartH;
  const thresholdY = yScale(contract.threshold);

  const pts = plotData.map((d, i) => ({ x: xScale(i), y: yScale(d.temp) }));
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.5;
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.5;
    path += ` C ${cp1x} ${pts[i - 1].y} ${cp2x} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  const belowPath = `${path} L ${pts[pts.length - 1].x} ${thresholdY} L ${pts[0].x} ${thresholdY} Z`;

  const yTicks = [Math.ceil(yMin), contract.threshold, Math.floor(yMax)]
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4FC3F7" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="hc">
          <rect x={padL} y={thresholdY} width={chartW} height={H - thresholdY} />
        </clipPath>
      </defs>

      {/* Grid */}
      {yTicks.map((t) => (
        <line key={t} x1={padL} y1={yScale(t)} x2={W - padR} y2={yScale(t)}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}

      {/* Y labels */}
      {yTicks.map((t) => (
        <text key={t} x={padL - 4} y={yScale(t) + 3.5} textAnchor="end"
          fontSize="8" fill={t === contract.threshold ? "#EF5350" : "rgba(255,255,255,0.3)"}
          fontFamily="monospace">
          {t > 0 ? `+${t}` : `${t}`}°
        </text>
      ))}

      {/* Threshold */}
      <line x1={padL} y1={thresholdY} x2={W - padR} y2={thresholdY}
        stroke="#EF5350" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

      {/* Below-threshold fill */}
      <path d={belowPath} fill="url(#hg)" clipPath="url(#hc)" />

      {/* Line */}
      <motion.path d={path} fill="none" stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }} />

      {/* Points */}
      {plotData.map((d, i) => (
        <g key={d.year}>
          {d.triggered && (
            <line x1={pts[i].x} y1={pts[i].y} x2={pts[i].x} y2={thresholdY}
              stroke="#4FC3F7" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
          )}
          <rect x={pts[i].x - 12} y={padT} width={24} height={chartH}
            fill="transparent" style={{ cursor: d.hasEvent ? "pointer" : "default" }}
            onMouseEnter={() => d.hasEvent && onHover(d.event)}
            onMouseLeave={() => onHover(null)} />
          <motion.circle cx={pts[i].x} cy={pts[i].y}
            r={d.triggered ? 4.5 : d.hasEvent ? 3 : 2}
            fill={d.triggered ? "#4FC3F7" : d.hasEvent ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}
            stroke={d.triggered ? "#0288D1" : "none"} strokeWidth="1.5"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.06, duration: 0.25 }} />
          {/* Year label — show every other to avoid crowding */}
          {i % 2 === 0 && (
            <text x={pts[i].x} y={H - 6} textAnchor="middle" fontSize="8"
              fill="rgba(255,255,255,0.3)" fontFamily="monospace">
              '{String(d.year).slice(2)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function HistoricalTimeline({
  events,
  contract,
  loading,
  onSeeCoverage,
}: HistoricalTimelineProps) {
  const triggeredCount = events.filter((e) => e.triggered).length;
  const totalLoss = Math.round(events.reduce((sum, e) => sum + e.estimatedLoss, 0));
  const animTriggered = useCountUp(triggeredCount, 200);
  const animLoss = useCountUp(totalLoss, 400);

  const trend = useMemo(() => analyzeTrend(events), [events]);
  const TrendIcon = trend.slope > 0.02 ? TrendingUp : trend.slope < -0.02 ? TrendingDown : Minus;
  const trendColor = trend.slope > 0.02 ? "text-danger-red" : trend.slope < -0.02 ? "text-success-green" : "text-white/50";

  const [hoveredEvent, setHoveredEvent] = useState<FrostEvent | null>(null);

  if (loading) {
    return (
      <motion.div
        className="absolute inset-0 z-20 flex items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative w-full max-w-[500px] bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl p-5">
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-5 h-5 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
            <span className="text-white/70 text-sm">Loading 10 years of data…</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-[500px] bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <p className="text-white/50 text-[10px] uppercase tracking-widest mb-2">
            10-year frost history
          </p>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="font-mono text-3xl font-bold text-accent-amber">{animTriggered}</span>
            <span className="text-white/70 text-sm">payouts would have triggered</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="font-mono text-lg font-bold text-danger-red">
              €{animLoss.toLocaleString()}
            </span>
            <span className="text-white/50 text-xs">in unpaid losses</span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{trend.description}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="px-3 pt-3 pb-1 relative">
          {/* Legend */}
          <div className="flex items-center gap-3 px-1 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-frost-blue" />
              <span className="text-[9px] text-white/50">Triggered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-white/35" />
              <span className="text-[9px] text-white/50">No trigger</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 border-t border-dashed border-danger-red/60" />
              <span className="text-[9px] text-white/50">{contract.threshold}°C threshold</span>
            </div>
          </div>

          <FrostLineChart events={events} contract={contract} onHover={setHoveredEvent} />

          {/* Hover tooltip */}
          <AnimatePresence>
            {hoveredEvent && (
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 top-3 bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none whitespace-nowrap z-10"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-white font-medium mb-0.5">
                  {new Date(hoveredEvent.date).toLocaleDateString("en-GB", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
                <p className="text-white/70">
                  <span className="font-mono text-frost-blue">{hoveredEvent.minTemp.toFixed(1)}°C</span>
                  {" "}for {hoveredEvent.durationHours}h
                  {hoveredEvent.triggered && (
                    <span className="text-accent-amber ml-2">
                      · €{Math.round(hoveredEvent.estimatedLoss).toLocaleString()} est. loss
                    </span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <div className="px-5 pb-5 pt-2">
          <motion.button
            onClick={onSeeCoverage}
            className="w-full py-3 bg-accent-amber text-bg-primary rounded-xl text-sm font-semibold
                       hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            See Coverage →
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
