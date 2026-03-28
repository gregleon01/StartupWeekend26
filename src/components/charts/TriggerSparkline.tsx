"use client";

import { motion } from "framer-motion";
import type { MockField, CropKey } from "@/types";

interface TriggerSparklineProps {
  fields: MockField[];
}

/** Simulate monthly trigger distribution based on crop sensitive windows */
const MONTH_WEIGHTS: Record<CropKey, number[]> = {
  // Indices 0-11 for Jan-Dec, weights for Mar-Jun (sensitive periods)
  cherries:  [0, 0, 0, 0.2, 0.6, 0.2, 0, 0, 0, 0, 0, 0],
  grapes:    [0, 0, 0, 0.1, 0.5, 0.4, 0, 0, 0, 0, 0, 0],
  wheat:     [0, 0, 0.3, 0.5, 0.2, 0, 0, 0, 0, 0, 0, 0],
  sunflower: [0, 0, 0, 0, 0.3, 0.5, 0.2, 0, 0, 0, 0, 0],
};

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export default function TriggerSparkline({ fields }: TriggerSparklineProps) {
  const triggered = fields.filter((f) => f.payoutTriggered);

  // Distribute triggers across months based on crop weights
  const monthCounts = new Array(12).fill(0);
  for (const f of triggered) {
    const weights = MONTH_WEIGHTS[f.crop];
    for (let m = 0; m < 12; m++) {
      monthCounts[m] += weights[m] * f.hectares;
    }
  }

  const max = Math.max(...monthCounts, 1);
  const barWidth = 16;
  const barGap = 4;
  const chartHeight = 50;
  const chartWidth = 12 * (barWidth + barGap);

  return (
    <div className="space-y-2">
      <p className="text-text-tertiary text-xs uppercase tracking-widest">
        Trigger Risk by Month
      </p>
      <svg
        width="100%"
        height={chartHeight + 16}
        viewBox={`0 0 ${chartWidth} ${chartHeight + 16}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {monthCounts.map((count, i) => {
          const height = (count / max) * chartHeight;
          const x = i * (barWidth + barGap);
          const y = chartHeight - height;
          const isActive = count > 0;

          return (
            <g key={i}>
              {/* Bar background */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                rx={3}
                fill="rgba(255,255,255,0.03)"
              />
              {/* Bar value */}
              <motion.rect
                x={x}
                y={y}
                width={barWidth}
                rx={3}
                fill={isActive ? "#F5A623" : "rgba(255,255,255,0.03)"}
                opacity={isActive ? 0.8 : 0.3}
                initial={{ height: 0, y: chartHeight }}
                animate={{ height, y }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.6, ease: "easeOut" }}
              />
              {/* Month label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 12}
                textAnchor="middle"
                fill={isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}
                fontSize="8"
                fontFamily="monospace"
              >
                {MONTHS[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
