"use client";

import { motion } from "framer-motion";
import type { MockField, CropKey } from "@/types";
import { contracts } from "@/lib/contracts";

interface CropPayoutChartProps {
  fields: MockField[];
}

const CROP_COLORS: Record<CropKey, string> = {
  cherries: "#EF5350",
  grapes: "#AB47BC",
  wheat: "#F5A623",
  sunflower: "#66BB6A",
};

export default function CropPayoutChart({ fields }: CropPayoutChartProps) {
  const triggered = fields.filter((f) => f.payoutTriggered);

  // Aggregate payouts by crop
  const cropData = (["cherries", "grapes", "wheat", "sunflower"] as CropKey[]).map((crop) => {
    const cropFields = triggered.filter((f) => f.crop === crop);
    const total = cropFields.reduce((sum, f) => sum + f.payoutAmount * f.hectares, 0);
    return { crop, total, count: cropFields.length };
  });

  const maxTotal = Math.max(...cropData.map((d) => d.total), 1);

  return (
    <div className="space-y-2.5">
      <p className="text-white/50 text-xs uppercase tracking-widest">
        Payouts by Crop
      </p>
      {cropData.map((d, i) => (
        <div key={d.crop} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70">
              {contracts[d.crop]?.icon} {contracts[d.crop]?.crop}
            </span>
            <span className="font-mono text-white font-bold">
              €{Math.round(d.total).toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: CROP_COLORS[d.crop] }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.total / maxTotal) * 100}%` }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-white/50 text-[10px]">
            {d.count} fields triggered
          </p>
        </div>
      ))}
    </div>
  );
}
