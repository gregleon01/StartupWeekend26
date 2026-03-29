"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PortfolioYearData, FarmerParcel } from "@/types";
import { contracts } from "@/lib/contracts";

interface HistoricalTimelineProps {
  portfolioYears: PortfolioYearData[];
  parcels: FarmerParcel[];
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

function PortfolioLineChart({
  portfolioYears,
  threshold,
  onHover,
}: {
  portfolioYears: PortfolioYearData[];
  threshold: number;
  onHover: (year: PortfolioYearData | null) => void;
}) {
  const W = 460;
  const H = 190;
  const padL = 36;
  const padR = 12;
  const padT = 28; // extra room for payout labels
  const padB = 22;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const plotData = portfolioYears.map((y) => {
    const minTemp = y.crops.length > 0
      ? Math.min(...y.crops.map((c) => c.minTemp))
      : threshold + 3;
    return {
      year: y.year,
      temp: minTemp,
      triggered: y.anyTriggered,
      totalPayout: y.totalPayout,
      hasEvent: y.crops.some((c) => c.durationHours > 0),
      data: y,
    };
  });

  const allTemps = plotData.map((d) => d.temp);
  const yMin = Math.min(...allTemps, threshold) - 1.5;
  const yMax = Math.max(...allTemps, threshold + 3) + 0.5;

  const xScale = (i: number) => padL + (i / (plotData.length - 1)) * chartW;
  const yScale = (t: number) => padT + ((yMax - t) / (yMax - yMin)) * chartH;
  const thresholdY = yScale(threshold);

  const pts = plotData.map((d, i) => ({ x: xScale(i), y: yScale(d.temp) }));
  const stepX = pts.length > 1 ? pts[1].x - pts[0].x : 36;

  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.5;
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.5;
    path += ` C ${cp1x} ${pts[i - 1].y} ${cp2x} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  const belowPath = `${path} L ${pts[pts.length - 1].x} ${thresholdY} L ${pts[0].x} ${thresholdY} Z`;

  const yTicks = [Math.ceil(yMin), threshold, Math.floor(yMax)]
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4FC3F7" stopOpacity="0.02" />
        </linearGradient>
        {/* Glow for triggered dots */}
        <filter id="dotGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Glow for threshold line */}
        <filter id="lineGlow" x="-5%" y="-300%" width="110%" height="700%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="hc">
          <rect x={padL} y={thresholdY} width={chartW} height={H - thresholdY} />
        </clipPath>
      </defs>

      {/* Frost event vertical bands */}
      {plotData.map((d, i) => d.triggered && (
        <rect key={`band-${d.year}`}
          x={pts[i].x - stepX * 0.45} y={padT - 4}
          width={stepX * 0.9} height={chartH + 4}
          fill="#4FC3F7" opacity="0.06" rx="3"
        />
      ))}

      {/* Grid */}
      {yTicks.map((t) => (
        <line key={t} x1={padL} y1={yScale(t)} x2={W - padR} y2={yScale(t)}
          stroke={t === threshold ? "rgba(239,83,80,0.12)" : "rgba(255,255,255,0.05)"}
          strokeWidth="1" />
      ))}

      {/* Y labels */}
      {yTicks.map((t) => (
        <text key={t} x={padL - 5} y={yScale(t) + 3.5} textAnchor="end"
          fontSize="8" fill={t === threshold ? "rgba(239,83,80,0.75)" : "rgba(255,255,255,0.22)"}
          fontFamily="monospace">
          {t > 0 ? `+${t}` : `${t}`}°
        </text>
      ))}

      {/* Threshold line — glowing red */}
      <line x1={padL} y1={thresholdY} x2={W - padR} y2={thresholdY}
        stroke="#EF5350" strokeWidth="2" strokeDasharray="4 3" opacity="0.3"
        filter="url(#lineGlow)" />
      <line x1={padL} y1={thresholdY} x2={W - padR} y2={thresholdY}
        stroke="#EF5350" strokeWidth="0.75" strokeDasharray="4 3" opacity="0.65" />

      {/* Below-threshold fill */}
      <path d={belowPath} fill="url(#hg)" clipPath="url(#hc)" />

      {/* Main temperature line */}
      <motion.path d={path} fill="none" stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.3, ease: "easeOut", delay: 0.15 }} />

      {/* Points */}
      {plotData.map((d, i) => (
        <g key={d.year}>
          {/* Invisible hit area */}
          <rect x={pts[i].x - stepX / 2} y={0} width={stepX} height={H}
            fill="transparent" style={{ cursor: "pointer" }}
            onMouseEnter={() => onHover(d.data)}
            onMouseLeave={() => onHover(null)} />

          {/* Drop line from triggered dot to threshold */}
          {d.triggered && (
            <line x1={pts[i].x} y1={pts[i].y + 7} x2={pts[i].x} y2={thresholdY}
              stroke="#4FC3F7" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
          )}

          {/* Payout label above triggered dot */}
          {d.triggered && (
            <motion.text
              x={pts[i].x} y={pts[i].y - 10}
              textAnchor="middle" fontSize="8" fontWeight="700"
              fill="#4FC3F7" fontFamily="monospace"
              initial={{ opacity: 0, y: pts[i].y - 6 }}
              animate={{ opacity: 1, y: pts[i].y - 10 }}
              transition={{ delay: 0.9 + i * 0.05, duration: 0.3 }}
            >
              €{d.totalPayout.toLocaleString()}
            </motion.text>
          )}

          {/* Outer pulse ring for triggered years */}
          {d.triggered && (
            <motion.circle cx={pts[i].x} cy={pts[i].y} r={8}
              fill="none" stroke="#4FC3F7" strokeWidth="1.5"
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{
                delay: 0.7 + i * 0.05,
                duration: 1.8,
                repeat: Infinity,
                repeatDelay: 2.5,
                ease: "easeOut",
              }}
            />
          )}

          {/* Main dot */}
          <motion.circle
            cx={pts[i].x} cy={pts[i].y}
            r={d.triggered ? 5.5 : d.hasEvent ? 3.5 : 2.5}
            fill={d.triggered ? "#4FC3F7" : d.hasEvent ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}
            stroke={d.triggered ? "#0EA5E9" : "none"}
            strokeWidth="1.5"
            filter={d.triggered ? "url(#dotGlow)" : undefined}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.45 + i * 0.06, duration: 0.35, type: "spring", stiffness: 220 }}
          />

          {/* Year label */}
          <text x={pts[i].x} y={H - 5} textAnchor="middle" fontSize="8"
            fill={d.triggered ? "rgba(79,195,247,0.65)" : "rgba(255,255,255,0.22)"}
            fontFamily="monospace" fontWeight={d.triggered ? "600" : "400"}>
            &apos;{String(d.year).slice(2)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function HistoricalTimeline({
  portfolioYears,
  parcels,
  loading,
  onSeeCoverage,
}: HistoricalTimelineProps) {
  const triggeredCount = portfolioYears.filter((y) => y.anyTriggered).length;
  const totalLoss = portfolioYears.reduce((s, y) => s + y.totalPayout, 0);
  const animTriggered = useCountUp(triggeredCount, 200);
  const animLoss = useCountUp(totalLoss, 400);

  const [hoveredYear, setHoveredYear] = useState<PortfolioYearData | null>(null);

  const threshold = useMemo(() => {
    if (parcels.length === 0) return -2;
    return Math.max(...parcels.map((p) => contracts[p.crop].threshold));
  }, [parcels]);

  const slope = useMemo(() => {
    if (portfolioYears.length < 3) return 0;
    const n = portfolioYears.length;
    const xs = portfolioYears.map((_, i) => i);
    const ys = portfolioYears.map((y) => (y.anyTriggered ? 1 : 0) as number);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
    const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
    return den === 0 ? 0 : num / den;
  }, [portfolioYears]);

  const TrendIcon = slope > 0.02 ? TrendingUp : slope < -0.02 ? TrendingDown : Minus;
  const trendColor = slope > 0.02 ? "text-danger-red" : slope < -0.02 ? "text-success-green" : "text-white/40";
  const trendText = slope > 0.02 ? "Frost frequency increasing" : slope < -0.02 ? "Frost frequency decreasing" : "Stable frost frequency";

  if (loading) {
    return (
      <motion.div
        className="absolute inset-0 z-20 flex items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative w-full max-w-[520px] bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl p-5">
          <div className="flex items-center gap-3 py-10 justify-center">
            <div className="w-5 h-5 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
            <span className="text-white/70 text-sm">Analyzing 10 years of frost data…</span>
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
      <div className="relative w-full max-w-[520px] bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/8">
          <p className="text-white/40 text-[9px] uppercase tracking-widest mb-3">
            Portfolio · 10-year frost history
          </p>

          {/* Big stats row */}
          <div className="flex items-start gap-6 mb-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <motion.span
                  className="font-mono text-4xl font-black text-accent-amber tabular-nums"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {animTriggered}
                </motion.span>
                <span className="text-white/50 text-sm">/ {portfolioYears.length} years</span>
              </div>
              <p className="text-white/40 text-[10px] mt-0.5">frost events triggered</p>
            </div>

            <div className="w-px h-10 bg-white/8 self-center" />

            <div>
              <div className="flex items-baseline gap-1">
                <motion.span
                  className="font-mono text-2xl font-bold text-danger-red tabular-nums"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  €{animLoss.toLocaleString()}
                </motion.span>
              </div>
              <p className="text-white/40 text-[10px] mt-0.5">would have paid out</p>
            </div>
          </div>

          {/* Year pill strip */}
          <div className="flex items-center gap-1 flex-wrap">
            {portfolioYears.map((y, i) => (
              <motion.div
                key={y.year}
                className={`w-5 h-1.5 rounded-full ${y.anyTriggered ? "bg-frost-blue" : "bg-white/12"}`}
                title={String(y.year)}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.04, duration: 0.25 }}
              />
            ))}
            <div className={`flex items-center gap-1 ml-2 text-[9px] ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{trendText}</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="px-2 pt-2 pb-0">
          {/* Legend */}
          <div className="flex items-center gap-4 px-2 mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-frost-blue shadow-[0_0_4px_#4FC3F7]" />
              <span className="text-[9px] text-white/40">Frost triggered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <span className="text-[9px] text-white/40">No trigger</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 border-t border-dashed border-danger-red/50" />
              <span className="text-[9px] text-white/40">{threshold}°C</span>
            </div>
          </div>

          <PortfolioLineChart
            portfolioYears={portfolioYears}
            threshold={threshold}
            onHover={setHoveredYear}
          />
        </div>

        {/* Hover detail panel */}
        <div className="px-5 pb-3 min-h-[60px] border-t border-white/8">
          <AnimatePresence mode="wait">
            {hoveredYear ? (
              <motion.div
                key={hoveredYear.year}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="pt-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-bold text-sm">{hoveredYear.year}</span>
                  {hoveredYear.anyTriggered ? (
                    <span className="text-xs font-semibold text-accent-amber bg-accent-amber/12 px-2.5 py-1 rounded-full">
                      Payout triggered · €{hoveredYear.totalPayout.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs text-white/35 bg-white/6 px-2.5 py-1 rounded-full">
                      No trigger
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {hoveredYear.crops.map((c) => (
                    <div key={c.key} className="flex items-center justify-between">
                      <span className="text-white/65 text-xs flex items-center gap-1.5">
                        <span>{c.icon}</span>
                        <span className="capitalize">{c.key}</span>
                        <span className="font-mono text-white/40">
                          {c.minTemp.toFixed(1)}°C · {c.durationHours}h
                        </span>
                      </span>
                      {c.triggered ? (
                        <span className="font-mono text-frost-blue text-xs font-semibold">
                          €{c.potentialPayout.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/20 text-xs text-center pt-5"
              >
                Hover a year to see crop details
              </motion.p>
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
