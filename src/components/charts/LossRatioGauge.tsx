"use client";

import { motion } from "framer-motion";

interface LossRatioGaugeProps {
  premiums: number;
  payouts: number;
}

export default function LossRatioGauge({ premiums, payouts }: LossRatioGaugeProps) {
  const ratio = premiums > 0 ? payouts / premiums : 0;
  const percent = Math.min(ratio * 100, 200); // cap visual at 200%
  const displayRatio = Math.round(ratio * 100);

  // Gauge goes from 0 to 180 degrees (semicircle)
  const angle = Math.min((percent / 200) * 180, 180);

  // Color: green < 60%, amber 60-100%, red > 100%
  const color =
    ratio < 0.6 ? "#66BB6A" : ratio < 1.0 ? "#F5A623" : "#EF5350";
  const label =
    ratio < 0.6 ? "Healthy" : ratio < 1.0 ? "Moderate" : "Unprofitable";

  // SVG arc path for semicircle gauge
  const r = 60; // radius
  const cx = 75;
  const cy = 70;
  const startAngle = Math.PI;
  const endAngle = startAngle - (angle * Math.PI) / 180;

  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = angle > 90 ? 1 : 0;

  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  const valuePath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

  return (
    <div className="space-y-1">
      <p className="text-text-tertiary text-xs uppercase tracking-widest">
        Loss Ratio
      </p>
      <div className="flex justify-center">
        <svg width="150" height="85" viewBox="0 0 150 85">
          {/* Background arc */}
          <path
            d={bgPath}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <motion.path
            d={valuePath}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
          />
          {/* Center text */}
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            className="font-mono font-bold"
            fill="currentColor"
            fontSize="22"
          >
            {displayRatio}%
          </text>
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fill={color}
            fontSize="9"
            fontWeight="600"
            style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
          >
            {label}
          </text>
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-text-tertiary px-2">
        <span>Premiums: €{premiums.toLocaleString()}</span>
        <span>Payouts: €{payouts.toLocaleString()}</span>
      </div>
    </div>
  );
}
