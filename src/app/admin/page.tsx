"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, TrendingUp, MapPin, AlertTriangle, Banknote, BarChart3, Radio, Home } from "lucide-react";
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

const ACTIVITY_TIMES = ["2h ago", "2h ago", "3h ago", "3h ago", "4h ago", "4h ago", "5h ago", "5h ago"];

export default function AdminPage() {
  const { triggerRates, loading: weatherLoading, isLiveData } = usePortfolioWeather();

  const fields = useMemo(
    () => generateMockFields(triggerRates),
    [triggerRates],
  );
  const stats = useMemo(() => computeFieldStats(fields), [fields]);
  const portfolio = useMemo(
    () => computePortfolioRisk(fields, triggerRates),
    [fields, triggerRates],
  );

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
      {/* Map */}
      <InsuredFieldsMap fields={fields} />

      {/* Header bar */}
      <div className="absolute top-0 inset-x-0 z-20 bg-bg-primary/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Shield className="w-5 h-5 text-accent-amber" />
              <span className="text-text-primary font-medium text-sm">Aklima</span>
            </Link>
            <span className="text-text-tertiary text-xs">
              Insurer Dashboard
            </span>
            <span className="text-text-tertiary text-xs">&middot;</span>
            <span className="text-text-secondary text-xs">
              Kyustendil Region
            </span>
            <span className="text-text-tertiary text-xs">&middot;</span>
            {weatherLoading ? (
              <span className="text-text-tertiary text-xs animate-pulse">
                Loading historical data…
              </span>
            ) : (
              <span className={`flex items-center gap-1 text-xs ${isLiveData ? "text-success-green" : "text-text-tertiary"}`}>
                <Radio className="w-3 h-3" />
                {isLiveData ? "Live historical data · Open-Meteo 2015–2025" : "Fallback rates"}
              </span>
            )}
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary/60 border border-border-subtle
                       rounded-lg text-text-secondary text-xs hover:text-text-primary transition-all"
          >
            <Home className="w-3 h-3" />
            Home
          </Link>
        </div>

        {/* Stats row */}
        <div className="px-6 pb-3 flex items-center gap-6 overflow-x-auto">
          <StatPill icon={<MapPin className="w-3.5 h-3.5" />} value={animFields} label="Fields Insured" />
          <StatPill icon={<TrendingUp className="w-3.5 h-3.5" />} value={animHa} label="ha Covered" />
          <StatPill icon={<Banknote className="w-3.5 h-3.5" />} value={animPremiums} label="Premiums Collected" prefix="€" amber />
          <StatPill icon={<AlertTriangle className="w-3.5 h-3.5" />} value={animTriggered} label="Payouts Triggered" danger />
          <StatPill icon={<Banknote className="w-3.5 h-3.5" />} value={animPaid} label="Paid Out" prefix="€" danger />
        </div>
      </div>

      {/* Right sidebar — analytics */}
      <div className="absolute top-[100px] right-0 bottom-0 w-[340px] z-20 bg-bg-secondary/85 backdrop-blur-xl border-l border-border-subtle overflow-y-auto">
        <div className="px-5 py-4 space-y-6">

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
              <BarChart3 className="w-3.5 h-3.5 text-text-tertiary" />
              <p className="text-text-tertiary text-xs uppercase tracking-widest">
                Portfolio Risk
              </p>
            </div>
            <RiskMetric label="Total Exposure" value={`€${portfolio.totalExposure.toLocaleString()}`} />
            <RiskMetric label="Expected Annual Payout" value={`€${portfolio.expectedAnnualPayout.toLocaleString()}`} />
            <RiskMetric label="VaR 95%" value={`€${portfolio.valueAtRisk95.toLocaleString()}`} highlight />
            <RiskMetric label="Correlation Zones" value={String(portfolio.correlationZones)} />
            <RiskMetric label="Diversification" value={`${Math.round(portfolio.diversificationBenefit * 100)}%`} />
          </div>

          {/* Recent Activity */}
          <div className="space-y-2">
            <p className="text-text-tertiary text-xs uppercase tracking-widest">
              Recent Payouts
            </p>
            {recentActivity.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center justify-between p-2.5 bg-bg-tertiary/50 rounded-lg"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{contracts[item.crop]?.icon}</span>
                  <div>
                    <p className="text-text-primary text-[11px] font-medium">Field #{item.fieldId}</p>
                    <p className="text-text-tertiary text-[10px]">{contracts[item.crop]?.crop}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-danger-red text-xs font-bold">€{item.amount}</p>
                  <p className="text-text-tertiary text-[9px]">{item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="space-y-2">
            <p className="text-text-tertiary text-xs uppercase tracking-widest mb-2">Legend</p>
            <LegendItem color="#66BB6A" label="Covered, no event" />
            <LegendItem color="#F5A623" label="Covered, elevated risk" />
            <LegendItem color="#EF5350" label="Payout triggered" />
            <LegendItem color="#555555" label="Not yet covered" />
          </div>
        </div>
      </div>
    </main>
  );
}

function StatPill({
  icon, value, label, prefix = "", amber = false, danger = false,
}: {
  icon: React.ReactNode; value: number; label: string; prefix?: string; amber?: boolean; danger?: boolean;
}) {
  const color = danger ? "text-danger-red" : amber ? "text-accent-amber" : "text-text-primary";
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div className="text-text-tertiary">{icon}</div>
      <span className={`font-mono text-sm font-bold tabular-nums ${color}`}>{prefix}{value.toLocaleString()}</span>
      <span className="text-text-tertiary text-xs">{label}</span>
    </div>
  );
}

function RiskMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-text-tertiary text-xs">{label}</span>
      <span className={`font-mono text-xs font-bold ${highlight ? "text-accent-amber" : "text-text-primary"}`}>{value}</span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-text-secondary text-xs">{label}</span>
    </div>
  );
}
