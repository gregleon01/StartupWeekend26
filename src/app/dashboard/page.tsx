"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, TrendingUp, MapPin, AlertTriangle, Banknote } from "lucide-react";
import { generateMockFields, computeFieldStats } from "@/lib/mockFields";
import { contracts } from "@/lib/contracts";
import type { CropKey } from "@/types";
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
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame.current);
    };
  }, [target, duration, delay]);
  return value;
}

const RECENT_ACTIVITY = [
  { fieldId: 147, crop: "cherries" as CropKey, amount: 340, time: "2h ago" },
  { fieldId: 23, crop: "grapes" as CropKey, amount: 280, time: "2h ago" },
  { fieldId: 89, crop: "cherries" as CropKey, amount: 340, time: "2h ago" },
  { fieldId: 195, crop: "sunflower" as CropKey, amount: 220, time: "3h ago" },
  { fieldId: 12, crop: "wheat" as CropKey, amount: 180, time: "3h ago" },
  { fieldId: 156, crop: "cherries" as CropKey, amount: 340, time: "3h ago" },
  { fieldId: 67, crop: "grapes" as CropKey, amount: 280, time: "4h ago" },
  { fieldId: 201, crop: "sunflower" as CropKey, amount: 220, time: "4h ago" },
];

export default function DashboardPage() {
  const fields = useMemo(() => generateMockFields(), []);
  const stats = useMemo(() => computeFieldStats(fields), [fields]);

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
            <Shield className="w-5 h-5 text-accent-amber" />
            <span className="text-text-primary font-medium text-sm">Niva</span>
            <span className="text-text-tertiary text-xs">
              Insurer Dashboard
            </span>
            <span className="text-text-tertiary text-xs">&middot;</span>
            <span className="text-text-secondary text-xs">
              Kyustendil Region
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="px-6 pb-3 flex items-center gap-6 overflow-x-auto">
          <StatPill
            icon={<MapPin className="w-3.5 h-3.5" />}
            value={animFields}
            label="Fields Insured"
          />
          <StatPill
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            value={animHa}
            label="ha Covered"
          />
          <StatPill
            icon={<Banknote className="w-3.5 h-3.5" />}
            value={animPremiums}
            label="Premiums Collected"
            prefix="€"
            amber
          />
          <StatPill
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            value={animTriggered}
            label="Payouts Triggered"
            danger
          />
          <StatPill
            icon={<Banknote className="w-3.5 h-3.5" />}
            value={animPaid}
            label="Paid Out"
            prefix="€"
            danger
          />
        </div>
      </div>

      {/* Right sidebar — recent activity */}
      <div className="absolute top-[100px] right-0 bottom-0 w-[320px] z-20 bg-bg-secondary/80 backdrop-blur-xl border-l border-border-subtle overflow-y-auto">
        <div className="px-5 py-4">
          <p className="text-text-tertiary text-xs uppercase tracking-widest mb-4">
            Recent Activity
          </p>

          <div className="space-y-2">
            {RECENT_ACTIVITY.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center justify-between p-3 bg-bg-tertiary/50 rounded-lg"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">
                    {contracts[item.crop]?.icon}
                  </span>
                  <div>
                    <p className="text-text-primary text-xs font-medium">
                      Field #{item.fieldId}
                    </p>
                    <p className="text-text-tertiary text-[11px]">
                      {contracts[item.crop]?.crop}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-danger-red text-sm font-bold">
                    &euro;{item.amount}
                  </p>
                  <p className="text-text-tertiary text-[10px]">{item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 space-y-2">
            <p className="text-text-tertiary text-xs uppercase tracking-widest mb-2">
              Legend
            </p>
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
  icon,
  value,
  label,
  prefix = "",
  amber = false,
  danger = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  prefix?: string;
  amber?: boolean;
  danger?: boolean;
}) {
  const color = danger
    ? "text-danger-red"
    : amber
      ? "text-accent-amber"
      : "text-text-primary";

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div className="text-text-tertiary">{icon}</div>
      <span className={`font-mono text-sm font-bold tabular-nums ${color}`}>
        {prefix}
        {value.toLocaleString()}
      </span>
      <span className="text-text-tertiary text-xs">{label}</span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-text-secondary text-xs">{label}</span>
    </div>
  );
}
