"use client";

import { motion } from "framer-motion";

interface TemperatureGaugeProps {
  temperature: number;
  threshold: number;
  visible: boolean;
  breached: boolean;
}

export default function TemperatureGauge({
  temperature,
  threshold,
  visible,
  breached,
}: TemperatureGaugeProps) {
  // Map temperature range -10..+10 → 0..100%
  const tempPercent = ((temperature + 10) / 20) * 100;
  const thresholdPercent = ((threshold + 10) / 20) * 100;

  return (
    <motion.div
      className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex items-center gap-4"
      initial={{ x: 100, opacity: 0 }}
      animate={visible ? { x: 0, opacity: 1 } : { x: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 180 }}
    >
      {/* Temperature readout */}
      <div className="text-right">
        <motion.p
          className={`font-mono text-4xl font-bold tabular-nums transition-colors duration-300 ${
            breached ? "text-danger-red" : "text-text-primary"
          }`}
        >
          {temperature.toFixed(1)}°C
        </motion.p>
        <p className="text-text-tertiary text-xs uppercase tracking-wider mt-1">
          Temperature
        </p>
      </div>

      {/* Vertical gauge bar */}
      <div className="relative w-12 h-[300px] rounded-full overflow-hidden bg-bg-tertiary border border-border-subtle">
        {/* Gradient background: red (top/hot) → white (0°C) → blue (bottom/cold) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(to bottom, #EF535040 0%, #EF535020 25%, #ffffff15 50%, #4FC3F720 75%, #0288D140 100%)",
          }}
        />

        {/* Threshold line */}
        <div
          className="absolute left-0 right-0 h-[2px] z-10"
          style={{
            bottom: `${thresholdPercent}%`,
            animation: breached ? "threshold-pulse 0.8s ease-in-out infinite" : "none",
          }}
        >
          <div
            className={`h-full transition-colors duration-300 ${
              breached ? "bg-danger-red" : "bg-danger-red/50"
            }`}
          />
          <span className="absolute right-full mr-2 -translate-y-1/2 text-[10px] font-mono text-danger-red whitespace-nowrap">
            {threshold}°C
          </span>
        </div>

        {/* Current temperature indicator */}
        <motion.div
          className="absolute left-1 right-1 z-20"
          animate={{ bottom: `${tempPercent}%` }}
          transition={{ type: "spring", damping: 15, stiffness: 80 }}
        >
          <div
            className={`h-[3px] rounded-full transition-colors duration-300 ${
              breached ? "bg-danger-red shadow-[0_0_12px_var(--color-danger-red)]" : "bg-text-primary"
            }`}
          />
        </motion.div>

        {/* Scale markers */}
        {[-8, -4, 0, 4, 8].map((t) => (
          <div
            key={t}
            className="absolute left-0 w-2 h-px bg-text-tertiary/30"
            style={{ bottom: `${((t + 10) / 20) * 100}%` }}
          />
        ))}
      </div>
    </motion.div>
  );
}
