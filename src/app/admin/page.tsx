"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, TrendingUp, MapPin, AlertTriangle, Banknote, BarChart3, Radio, ArrowLeft, Activity, Layers } from "lucide-react";
import Link from "next/link";
import { generateMockFields, computeFieldStats } from "@/lib/mockFields";
import { computePortfolioRisk } from "@/lib/statistics";
import { contracts } from "@/lib/contracts";
import { usePortfolioWeather } from "@/hooks/usePortfolioWeather";
import type { CropKey, MockField } from "@/types";
import InsuredFieldsMap from "@/components/InsuredFieldsMap";

function useCountUp(target: number, duration: number = 1200, delay: number = 0) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame.current); };
  }, [target, duration, delay]);
  return value;
}

/* ------------------------------------------------------------------ */
/*  Crop colors + helpers                                              */
/* ------------------------------------------------------------------ */

const CROP_COLORS: Record<CropKey, string> = {
  cherries: "#EF5350", grapes: "#AB47BC", wheat: "#F5A623", sunflower: "#66BB6A",
};

const MONTH_WEIGHTS: Record<CropKey, number[]> = {
  cherries:  [0, 0, 0, 0.2, 0.6, 0.2, 0, 0, 0, 0, 0, 0],
  grapes:    [0, 0, 0, 0.1, 0.5, 0.4, 0, 0, 0, 0, 0, 0],
  wheat:     [0, 0, 0.3, 0.5, 0.2, 0, 0, 0, 0, 0, 0, 0],
  sunflower: [0, 0, 0, 0, 0.3, 0.5, 0.2, 0, 0, 0, 0, 0],
};
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function computeMonthlyTriggers(fields: MockField[]) {
  const triggered = fields.filter((f) => f.payoutTriggered);
  const counts = new Array(12).fill(0);
  for (const f of triggered) {
    const w = MONTH_WEIGHTS[f.crop];
    for (let m = 0; m < 12; m++) counts[m] += w[m] * f.hectares;
  }
  return counts;
}

function computeCropBreakdown(fields: MockField[]) {
  const triggered = fields.filter((f) => f.payoutTriggered);
  return (["cherries", "grapes", "wheat", "sunflower"] as CropKey[]).map((crop) => {
    const cropFields = triggered.filter((f) => f.crop === crop);
    const total = cropFields.reduce((sum, f) => sum + f.payoutAmount * f.hectares, 0);
    const covered = fields.filter((f) => f.crop === crop && f.covered);
    const ha = covered.reduce((sum, f) => sum + f.hectares, 0);
    return { crop, total, count: cropFields.length, ha: Math.round(ha), fields: covered.length };
  });
}

const ACTIVITY_TIMES = ["2h ago", "2h ago", "3h ago", "3h ago", "4h ago", "4h ago", "5h ago", "5h ago"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const { triggerRates, loading: weatherLoading, isLiveData } = usePortfolioWeather();

  const fields = useMemo(() => generateMockFields(triggerRates), [triggerRates]);
  const stats = useMemo(() => computeFieldStats(fields), [fields]);
  const portfolio = useMemo(() => computePortfolioRisk(fields, triggerRates), [fields, triggerRates]);
  const cropData = useMemo(() => computeCropBreakdown(fields), [fields]);
  const monthCounts = useMemo(() => computeMonthlyTriggers(fields), [fields]);

  const recentActivity = useMemo(
    () => fields.filter((f) => f.payoutTriggered).slice(0, 8).map((f, i) => ({
      fieldId: f.id, crop: f.crop, amount: f.payoutAmount,
      time: ACTIVITY_TIMES[i] ?? "5h ago",
    })),
    [fields],
  );

  const animFields = useCountUp(stats.fieldsInsured, 1200, 200);
  const animHa = useCountUp(stats.hectaresCovered, 1200, 350);
  const animPremiums = useCountUp(stats.premiumsCollected, 1200, 500);
  const animTriggered = useCountUp(stats.payoutsTriggered, 1200, 650);
  const animPaid = useCountUp(stats.totalPaidOut, 1200, 800);

  const lossRatio = stats.premiumsCollected > 0 ? stats.totalPaidOut / stats.premiumsCollected : 0;
  const lossColor = lossRatio < 0.6 ? "text-success-green" : lossRatio < 1.0 ? "text-accent-amber" : "text-danger-red";
  const lossLabel = lossRatio < 0.6 ? "Healthy" : lossRatio < 1.0 ? "Moderate" : "Unprofitable";

  const maxCropTotal = Math.max(...cropData.map((d) => d.total), 1);
  const maxMonth = Math.max(...monthCounts, 1);

  // Forecast & Trends data
  const annualPayoutTrend = useMemo(() => {
    const triggered = fields.filter((f) => f.payoutTriggered);
    const basePayout = triggered.reduce((s, f) => s + f.payoutAmount * f.hectares, 0);
    // Distribute across years 2020-2025 with some variance
    const yearWeights = [0.6, 0.8, 1.2, 0.9, 1.1, 1.0];
    return [2020, 2021, 2022, 2023, 2024, 2025].map((year, i) => ({
      year,
      payout: Math.round((basePayout / 6) * yearWeights[i]),
    }));
  }, [fields]);

  const coverageRate = useMemo(() => {
    if (fields.length === 0) return 0;
    return Math.round((fields.filter((f) => f.covered).length / fields.length) * 100);
  }, [fields]);

  const fiveYrAvg = useMemo(() => {
    const total = annualPayoutTrend.reduce((s, y) => s + y.payout, 0);
    return Math.round(total / annualPayoutTrend.length);
  }, [annualPayoutTrend]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      {/* Map — full bleed, top 55% of screen */}
      <div className="absolute inset-0 bottom-[45vh]">
        <InsuredFieldsMap fields={fields} />
      </div>

      {/* Aklima home — top left */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-4 py-2
                   bg-white/8 backdrop-blur-xl border border-white/12 rounded-full
                   text-white/60 text-xs hover:text-white hover:bg-white/14 transition-all shadow-xl outline-none"
      >
        <ArrowLeft className="w-3 h-3" />
        Aklima
      </Link>

      {/* Title chip — centered */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-3 px-5 py-2 bg-white/8 backdrop-blur-xl border border-white/12 rounded-full shadow-xl">
          <Shield className="w-4 h-4 text-accent-amber" />
          <span className="text-white text-sm font-medium">Insurer Dashboard</span>
          <span className="text-white/20">·</span>
          <span className="text-white/60 text-xs">Kyustendil Region</span>
          <span className="text-white/20">·</span>
          {weatherLoading ? (
            <span className="text-white/40 text-xs animate-pulse">Loading…</span>
          ) : (
            <span className={`flex items-center gap-1 text-xs ${isLiveData ? "text-success-green" : "text-white/40"}`}>
              <Radio className="w-3 h-3" />
              {isLiveData ? "Live data" : "Fallback"}
            </span>
          )}
        </div>
      </div>

      {/* Bottom dashboard panel */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 h-[48vh] z-30
                   bg-white/8 backdrop-blur-2xl border-t border-white/12 shadow-2xl"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "tween", duration: 0.4, ease: "easeOut", delay: 0.15 }}
      >
        {/* Stats row — top edge of panel */}
        <div className="flex items-center gap-5 px-8 py-3 border-b border-white/8 overflow-x-auto">
          <StatPill icon={<MapPin className="w-3.5 h-3.5" />} value={animFields} label="Fields" />
          <div className="w-px h-4 bg-white/10" />
          <StatPill icon={<TrendingUp className="w-3.5 h-3.5" />} value={animHa} label="ha" />
          <div className="w-px h-4 bg-white/10" />
          <StatPill icon={<Banknote className="w-3.5 h-3.5" />} value={animPremiums} label="Premiums" prefix="€" amber />
          <div className="w-px h-4 bg-white/10" />
          <StatPill icon={<AlertTriangle className="w-3.5 h-3.5" />} value={animTriggered} label="Triggered" danger />
          <div className="w-px h-4 bg-white/10" />
          <StatPill icon={<Banknote className="w-3.5 h-3.5" />} value={animPaid} label="Paid Out" prefix="€" danger />
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Activity className="w-3.5 h-3.5 text-white/40" />
            <span className={`font-mono text-sm font-bold ${lossColor}`}>{Math.round(lossRatio * 100)}%</span>
            <span className="text-white/40 text-xs">Loss Ratio</span>
            <span className={`text-[9px] font-medium uppercase tracking-wider ${lossColor}`}>({lossLabel})</span>
          </div>
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-5 gap-0 h-[calc(100%-52px)]">

          {/* Column 1: Crop Breakdown */}
          <div className="border-r border-white/8 px-5 py-4 overflow-y-auto">
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Crop Exposure
            </p>
            {cropData.map((d, i) => (
              <div key={d.crop} className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/70 flex items-center gap-1.5">
                    <span>{contracts[d.crop]?.icon}</span>
                    <span>{contracts[d.crop]?.crop}</span>
                  </span>
                  <span className="font-mono text-white font-bold text-[11px]">
                    €{Math.round(d.total).toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: CROP_COLORS[d.crop] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.total / maxCropTotal) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-white/30 mt-0.5">
                  <span>{d.fields} fields · {d.ha} ha</span>
                  <span>{d.count} triggered</span>
                </div>
              </div>
            ))}
          </div>

          {/* Column 2: Monthly Trigger Heatmap */}
          <div className="border-r border-white/8 px-5 py-4">
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" />
              Monthly Triggers
            </p>
            <svg width="100%" height="180" viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet">
              {monthCounts.map((count, i) => {
                const barW = 16;
                const gap = 4;
                const chartH = 150;
                const x = i * (barW + gap);
                const pct = count / maxMonth;
                const h = pct * chartH;
                const active = count > 0;
                return (
                  <g key={i}>
                    <rect x={x} y={0} width={barW} height={chartH} rx={3} fill="rgba(255,255,255,0.04)" />
                    <motion.rect
                      x={x} width={barW} rx={3}
                      fill={active ? "#F5A623" : "rgba(255,255,255,0.04)"}
                      opacity={active ? 0.85 : 0.3}
                      initial={{ height: 0, y: chartH }}
                      animate={{ height: h, y: chartH - h }}
                      transition={{ delay: 0.2 + i * 0.04, duration: 0.6, ease: "easeOut" }}
                    />
                    <text x={x + barW / 2} y={chartH + 14} textAnchor="middle"
                      fill={active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}
                      fontSize="9" fontFamily="monospace">
                      {MONTHS[i]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Column 3: Portfolio Risk */}
          <div className="border-r border-white/8 px-5 py-4">
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Portfolio Risk
            </p>
            <div className="space-y-3">
              <RiskRow label="Total Exposure" value={`€${portfolio.totalExposure.toLocaleString()}`} />
              <RiskRow label="Expected Annual" value={`€${portfolio.expectedAnnualPayout.toLocaleString()}`} />
              <RiskRow label="VaR 95%" value={`€${portfolio.valueAtRisk95.toLocaleString()}`} highlight />
              <RiskRow label="Max Possible" value={`€${portfolio.maxPossiblePayout.toLocaleString()}`} />
              <div className="h-px bg-white/8" />
              <RiskRow label="Correlation Zones" value={String(portfolio.correlationZones)} />
              <RiskRow label="Diversification" value={`${Math.round(portfolio.diversificationBenefit * 100)}%`} />
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-1.5">
              <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">Map Legend</p>
              <LegendDot color="#66BB6A" label="Covered" />
              <LegendDot color="#F5A623" label="High risk" />
              <LegendDot color="#EF5350" label="Triggered" />
              <LegendDot color="#555555" label="Uninsured" />
            </div>
          </div>

          {/* Column 4: Recent Activity Feed */}
          <div className="border-r border-white/8 px-5 py-4 overflow-y-auto">
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              Recent Payouts
            </p>
            <div className="space-y-2">
              {recentActivity.map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-white/4 border border-white/6 rounded-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{contracts[item.crop]?.icon}</span>
                    <div>
                      <p className="text-white text-[10px] font-medium">Field #{item.fieldId}</p>
                      <p className="text-white/30 text-[9px]">{contracts[item.crop]?.crop}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-danger-red text-[11px] font-bold">€{item.amount}</p>
                    <p className="text-white/20 text-[8px]">{item.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Column 5: Forecast & Trends */}
          <div className="px-5 py-4 overflow-y-auto">
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              Forecast &amp; Trends
            </p>

            {/* a) Annual Payout Trend — SVG line chart */}
            {(() => {
              const W = 200;
              const H = 100;
              const padL = 4;
              const padR = 4;
              const padT = 8;
              const padB = 18;
              const chartW = W - padL - padR;
              const chartH = H - padT - padB;
              const data = annualPayoutTrend;
              const maxP = Math.max(...data.map((d) => d.payout), 1);
              const pts = data.map((d, i) => ({
                x: padL + (i / (data.length - 1)) * chartW,
                y: padT + ((maxP - d.payout) / maxP) * chartH,
              }));
              let linePath = `M ${pts[0].x} ${pts[0].y}`;
              for (let i = 1; i < pts.length; i++) {
                const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.5;
                const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.5;
                linePath += ` C ${cp1x} ${pts[i - 1].y} ${cp2x} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
              }
              const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${padT + chartH} L ${pts[0].x} ${padT + chartH} Z`;
              return (
                <div className="mb-4">
                  <p className="text-white/40 text-[9px] uppercase tracking-widest mb-1.5">Annual Payout Trend</p>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F5A623" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#F5A623" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#trendFill)" />
                    <motion.path
                      d={linePath}
                      fill="none"
                      stroke="#F5A623"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                    />
                    {pts.map((p, i) => (
                      <motion.circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={3}
                        fill="#F5A623"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.08, duration: 0.25 }}
                      />
                    ))}
                    {data.map((d, i) => (
                      <text
                        key={d.year}
                        x={pts[i].x}
                        y={H - 4}
                        textAnchor="middle"
                        fontSize="8"
                        fill="rgba(255,255,255,0.3)"
                        fontFamily="monospace"
                      >
                        {String(d.year).slice(2)}
                      </text>
                    ))}
                  </svg>
                </div>
              );
            })()}

            {/* b) Risk Forecast */}
            <div className="mb-4">
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-2">Risk Forecast</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[11px]">Next Season Est.</span>
                  <span className="font-mono text-[11px] font-bold text-accent-amber">
                    &euro;{portfolio.expectedAnnualPayout.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[11px]">5yr Avg Payout</span>
                  <span className="font-mono text-[11px] font-bold text-white">
                    &euro;{fiveYrAvg.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[11px]">Worst Case</span>
                  <span className="font-mono text-[11px] font-bold text-danger-red">
                    &euro;{portfolio.maxPossiblePayout.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* c) Coverage Gap */}
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-2">Coverage Gap</p>
              <div className="h-2 bg-white/6 rounded-full overflow-hidden mb-1.5">
                <motion.div
                  className="h-full rounded-full bg-success-green"
                  initial={{ width: 0 }}
                  animate={{ width: `${coverageRate}%` }}
                  transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-white/50 text-[10px]">
                <span className="font-mono text-white font-bold">{coverageRate}%</span> coverage rate
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatPill({
  icon, value, label, prefix = "", amber = false, danger = false,
}: {
  icon: React.ReactNode; value: number; label: string; prefix?: string; amber?: boolean; danger?: boolean;
}) {
  const color = danger ? "text-danger-red" : amber ? "text-accent-amber" : "text-white";
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <div className="text-white/40">{icon}</div>
      <span className={`font-mono text-sm font-bold tabular-nums ${color}`}>{prefix}{value.toLocaleString()}</span>
      <span className="text-white/40 text-xs">{label}</span>
    </div>
  );
}

function RiskRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40 text-[11px]">{label}</span>
      <span className={`font-mono text-[11px] font-bold ${highlight ? "text-accent-amber" : "text-white"}`}>{value}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-white/40 text-[9px]">{label}</span>
    </div>
  );
}
