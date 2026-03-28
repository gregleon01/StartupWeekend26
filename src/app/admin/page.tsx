"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, TrendingUp, MapPin, AlertTriangle, Banknote, BarChart3, Radio, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { generateMockFields, computeFieldStats } from "@/lib/mockFields";
import { computePortfolioRisk } from "@/lib/statistics";
import { contracts } from "@/lib/contracts";
import { usePortfolioWeather } from "@/hooks/usePortfolioWeather";
import type { CropKey } from "@/types";
import InsuredFieldsMap from "@/components/InsuredFieldsMap";
import CropPayoutChart from "@/components/charts/CropPayoutChart";
import LossRatioGauge from "@/components/charts/LossRatioGauge";
import TriggerSparkline from "@/components/charts/TriggerSparkline";

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
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame.current);
    };
  }, [target, duration, delay]);
  return value;
}

const ACTIVITY_TIMES = ["2h ago", "2h ago", "3h ago", "3h ago", "4h ago", "4h ago"];

export default function AdminPage() {
  const { triggerRates, loading: weatherLoading, isLiveData } = usePortfolioWeather();

  const fields = useMemo(() => generateMockFields(triggerRates), [triggerRates]);
  const stats = useMemo(() => computeFieldStats(fields), [fields]);
  const portfolio = useMemo(() => computePortfolioRisk(fields, triggerRates), [fields, triggerRates]);

  const recentActivity = useMemo(
    () =>
      fields
        .filter((f) => f.payoutTriggered)
        .slice(0, 6)
        .map((f, i) => ({
          fieldId: f.id,
          crop: f.crop,
          amount: f.payoutAmount,
          time: ACTIVITY_TIMES[i] ?? "5h ago",
        })),
    [fields],
  );

  const animFields = useCountUp(stats.fieldsInsured, 1200, 200);
  const animHa = useCountUp(stats.hectaresCovered, 1200, 350);
  const animPremiums = useCountUp(stats.premiumsCollected, 1200, 500);
  const animTriggered = useCountUp(stats.payoutsTriggered, 1200, 650);
  const animPaid = useCountUp(stats.totalPaidOut, 1200, 800);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      {/* Map — full bleed */}
      <InsuredFieldsMap fields={fields} />

      {/* Aklima home — top left pill */}
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
          <span className="text-white/30">·</span>
          <span className="text-white/60 text-xs">Kyustendil Region</span>
          <span className="text-white/30">·</span>
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

      {/* Stats row — floating pill at top */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-5 px-6 py-2.5 bg-white/8 backdrop-blur-xl border border-white/12 rounded-full shadow-xl">
          <StatPill icon={<MapPin className="w-3.5 h-3.5" />} value={animFields} label="Fields" />
          <div className="w-px h-4 bg-white/12" />
          <StatPill icon={<TrendingUp className="w-3.5 h-3.5" />} value={animHa} label="ha" />
          <div className="w-px h-4 bg-white/12" />
          <StatPill icon={<Banknote className="w-3.5 h-3.5" />} value={animPremiums} label="Premiums" prefix="€" amber />
          <div className="w-px h-4 bg-white/12" />
          <StatPill icon={<AlertTriangle className="w-3.5 h-3.5" />} value={animTriggered} label="Triggered" danger />
          <div className="w-px h-4 bg-white/12" />
          <StatPill icon={<Banknote className="w-3.5 h-3.5" />} value={animPaid} label="Paid Out" prefix="€" danger />
        </div>
      </div>

      {/* Right sidebar — floating glass panel */}
      <motion.div
        className="absolute top-4 right-4 bottom-4 w-[320px] z-20
                   bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl
                   overflow-hidden shadow-xl flex flex-col"
        initial={{ x: 340, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, delay: 0.2 }}
      >
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Loss Ratio Gauge */}
          <LossRatioGauge
            premiums={stats.premiumsCollected}
            payouts={stats.totalPaidOut}
          />

          {/* Payout by Crop */}
          <CropPayoutChart fields={fields} />

          {/* Monthly Trigger Distribution */}
          <TriggerSparkline fields={fields} />

          {/* Portfolio Risk Metrics */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart3 className="w-3.5 h-3.5 text-white/50" />
              <p className="text-white/50 text-xs uppercase tracking-widest">
                Portfolio Risk
              </p>
            </div>
            <RiskMetric label="Total Exposure" value={`€${portfolio.totalExposure.toLocaleString()}`} />
            <RiskMetric label="Expected Annual" value={`€${portfolio.expectedAnnualPayout.toLocaleString()}`} />
            <RiskMetric label="VaR 95%" value={`€${portfolio.valueAtRisk95.toLocaleString()}`} highlight />
            <RiskMetric label="Zones" value={String(portfolio.correlationZones)} />
            <RiskMetric label="Diversification" value={`${Math.round(portfolio.diversificationBenefit * 100)}%`} />
          </div>

          {/* Divider */}
          <div className="h-px bg-white/8" />

          {/* Recent Payouts */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs uppercase tracking-widest">
              Recent Payouts
            </p>
            {recentActivity.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center justify-between p-2.5 bg-white/6 border border-white/8 rounded-xl"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{contracts[item.crop]?.icon}</span>
                  <div>
                    <p className="text-white text-[11px] font-medium">Field #{item.fieldId}</p>
                    <p className="text-white/40 text-[10px]">{contracts[item.crop]?.crop}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-danger-red text-xs font-bold">€{item.amount}</p>
                  <p className="text-white/30 text-[9px]">{item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Legend</p>
            <LegendItem color="#66BB6A" label="Covered, no event" />
            <LegendItem color="#F5A623" label="Covered, elevated risk" />
            <LegendItem color="#EF5350" label="Payout triggered" />
            <LegendItem color="#555555" label="Not yet covered" />
          </div>
        </div>
      </motion.div>
    </main>
  );
}

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

function RiskMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-white/50 text-xs">{label}</span>
      <span className={`font-mono text-xs font-bold ${highlight ? "text-accent-amber" : "text-white"}`}>{value}</span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-white/60 text-xs">{label}</span>
    </div>
  );
}
