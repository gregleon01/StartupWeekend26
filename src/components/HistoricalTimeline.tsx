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
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame.current);
    };
  }, [target, delay]);

  return value;
}

/** SVG line chart showing min temperature per year against the trigger threshold */
function FrostLineChart({
  events,
  contract,
  onHover,
}: {
  events: FrostEvent[];
  contract: ParametricContract;
  onHover: (event: FrostEvent | null) => void;
}) {
  const W = 800;
  const H = 110;
  const padL = 38;
  const padR = 12;
  const padT = 10;
  const padB = 28;

  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // For years with no frost event, place the point safely above threshold
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

  // Build smooth bezier path
  const pts = plotData.map((d, i) => ({ x: xScale(i), y: yScale(d.temp) }));
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.5;
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.5;
    path += ` C ${cp1x} ${pts[i - 1].y} ${cp2x} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }

  // Area fill below threshold
  const belowPath = `${path} L ${pts[pts.length - 1].x} ${thresholdY} L ${pts[0].x} ${thresholdY} Z`;

  // Y-axis tick values
  const yTicks = [
    Math.ceil(yMin),
    contract.threshold,
    Math.round((contract.threshold + yMax) / 2),
    Math.floor(yMax),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: 110 }}
    >
      <defs>
        <linearGradient id="belowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4FC3F7" stopOpacity="0.03" />
        </linearGradient>
        <clipPath id="belowClip">
          <rect x={padL} y={thresholdY} width={chartW} height={H - thresholdY} />
        </clipPath>
      </defs>

      {/* Horizontal grid lines */}
      {yTicks.map((t) => (
        <line
          key={t}
          x1={padL}
          y1={yScale(t)}
          x2={W - padR}
          y2={yScale(t)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((t) => (
        <text
          key={t}
          x={padL - 6}
          y={yScale(t) + 4}
          textAnchor="end"
          fontSize="9"
          fill={t === contract.threshold ? "#EF5350" : "rgba(255,255,255,0.35)"}
          fontFamily="monospace"
        >
          {t > 0 ? `+${t}` : `${t}`}°
        </text>
      ))}

      {/* Threshold line */}
      <line
        x1={padL}
        y1={thresholdY}
        x2={W - padR}
        y2={thresholdY}
        stroke="#EF5350"
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.7"
      />
      <text
        x={W - padR + 2}
        y={thresholdY + 4}
        fontSize="8"
        fill="#EF5350"
        opacity="0.8"
        fontFamily="monospace"
      >
        {contract.threshold}°
      </text>

      {/* Area fill below threshold */}
      <path d={belowPath} fill="url(#belowGrad)" clipPath="url(#belowClip)" />

      {/* Main line */}
      <motion.path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
      />

      {/* Data points */}
      {plotData.map((d, i) => (
        <g key={d.year}>
          {/* Vertical drop to threshold for triggered events */}
          {d.triggered && (
            <line
              x1={pts[i].x}
              y1={pts[i].y}
              x2={pts[i].x}
              y2={thresholdY}
              stroke="#4FC3F7"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.4"
            />
          )}

          {/* Hit area for hover */}
          <rect
            x={pts[i].x - 14}
            y={padT}
            width={28}
            height={chartH}
            fill="transparent"
            style={{ cursor: d.hasEvent ? "pointer" : "default" }}
            onMouseEnter={() => d.hasEvent && onHover(d.event)}
            onMouseLeave={() => onHover(null)}
          />

          {/* Dot */}
          <motion.circle
            cx={pts[i].x}
            cy={pts[i].y}
            r={d.triggered ? 5 : d.hasEvent ? 3.5 : 2.5}
            fill={
              d.triggered
                ? "#4FC3F7"
                : d.hasEvent
                  ? "rgba(255,255,255,0.4)"
                  : "rgba(255,255,255,0.12)"
            }
            stroke={d.triggered ? "#0288D1" : "none"}
            strokeWidth="1.5"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.07, duration: 0.3 }}
          />

          {/* Year label */}
          <text
            x={pts[i].x}
            y={H - 4}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(255,255,255,0.35)"
            fontFamily="monospace"
          >
            {String(d.year).slice(2)}
          </text>
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
  const TrendIcon =
    trend.slope > 0.02 ? TrendingUp : trend.slope < -0.02 ? TrendingDown : Minus;
  const trendColor =
    trend.slope > 0.02
      ? "text-danger-red"
      : trend.slope < -0.02
        ? "text-success-green"
        : "text-text-tertiary";

  const [hoveredEvent, setHoveredEvent] = useState<FrostEvent | null>(null);

  if (loading) {
    return (
      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 h-[200px] bg-bg-secondary/95 backdrop-blur-xl border-t border-border-subtle"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-center h-full gap-3">
          <div className="w-5 h-5 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">
            Loading 10 years of weather data…
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-20"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
      {/* Summary + CTA */}
      <div className="px-6 pb-3 flex items-end justify-between">
        <div>
          <p className="text-text-secondary text-xs uppercase tracking-widest mb-1">
            10-year frost history · min temperature per season
          </p>
          <p className="text-text-primary text-sm">
            <span className="font-mono text-accent-amber font-bold">{animTriggered}</span>{" "}
            events would have triggered &middot;{" "}
            <span className="font-mono text-danger-red font-bold">
              &euro;{animLoss.toLocaleString()}
            </span>{" "}
            unpaid losses
          </p>
          <div className={`flex items-center gap-1 text-xs mt-0.5 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{trend.description}</span>
          </div>
        </div>
        <motion.button
          onClick={onSeeCoverage}
          className="px-5 py-2.5 bg-accent-amber text-bg-primary rounded-xl text-sm font-semibold
                     hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          See Coverage
        </motion.button>
      </div>

      {/* Chart panel */}
      <div className="bg-bg-secondary/95 backdrop-blur-xl border-t border-border-subtle px-4 pt-3 pb-2 relative">

        {/* Legend */}
        <div className="flex items-center gap-4 px-2 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-frost-blue" />
            <span className="text-[10px] text-text-tertiary">Payout triggered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <span className="text-[10px] text-text-tertiary">Cold event, no trigger</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 border-t border-dashed border-danger-red/70" />
            <span className="text-[10px] text-text-tertiary">Trigger threshold ({contract.threshold}°C)</span>
          </div>
        </div>

        <FrostLineChart
          events={events}
          contract={contract}
          onHover={setHoveredEvent}
        />

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredEvent && (
            <motion.div
              className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none whitespace-nowrap"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <p className="text-text-primary font-medium mb-0.5">
                {new Date(hoveredEvent.date).toLocaleDateString("en-GB", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-text-secondary">
                <span className="font-mono text-frost-blue">
                  {hoveredEvent.minTemp.toFixed(1)}°C
                </span>{" "}
                for {hoveredEvent.durationHours}h
                {hoveredEvent.triggered && (
                  <span className="text-accent-amber ml-2">
                    · Est. loss €{Math.round(hoveredEvent.estimatedLoss).toLocaleString()}
                  </span>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
