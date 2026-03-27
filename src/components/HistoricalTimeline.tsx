"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { FrostEvent, ParametricContract } from "@/types";

interface HistoricalTimelineProps {
  events: FrostEvent[];
  contract: ParametricContract;
  loading: boolean;
  onSeeCoverage: () => void;
}

/** Animate a number from 0 to target over ~1 second */
function useCountUp(target: number, delay: number = 0) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const duration = 1000;

      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        // Ease out cubic
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

export default function HistoricalTimeline({
  events,
  contract,
  loading,
  onSeeCoverage,
}: HistoricalTimelineProps) {
  const triggeredCount = events.filter((e) => e.triggered).length;
  const totalLoss = Math.round(
    events.reduce((sum, e) => sum + e.estimatedLoss, 0),
  );

  const animTriggered = useCountUp(triggeredCount, 200);
  const animLoss = useCountUp(totalLoss, 400);

  const [tooltip, setTooltip] = useState<{
    event: FrostEvent;
    x: number;
  } | null>(null);

  if (loading) {
    return (
      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 h-[180px] bg-bg-secondary/95 backdrop-blur-xl border-t border-border-subtle"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-center h-full gap-3">
          <div className="w-5 h-5 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">
            Loading 10 years of weather data...
          </span>
        </div>
      </motion.div>
    );
  }

  // Max bar height based on worst event for scaling
  const maxDuration = Math.max(...events.map((e) => e.durationHours), 1);

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
            10-year frost history
          </p>
          <p className="text-text-primary text-sm">
            <span className="font-mono text-accent-amber font-bold">
              {animTriggered}
            </span>{" "}
            frost events would have triggered payout &middot;{" "}
            <span className="font-mono text-danger-red font-bold">
              &euro;{animLoss.toLocaleString()}
            </span>{" "}
            unpaid losses
          </p>
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

      {/* Timeline bars */}
      <div className="bg-bg-secondary/95 backdrop-blur-xl border-t border-border-subtle px-6 pt-4 pb-6 relative">
        <div className="flex items-end justify-between gap-1 h-[80px]">
          {events.map((event, i) => {
            const barHeight =
              event.durationHours > 0
                ? Math.max(8, (event.durationHours / maxDuration) * 72)
                : 2;

            return (
              <motion.div
                key={event.year}
                className="flex-1 flex flex-col items-center gap-1 cursor-pointer relative"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                style={{ originY: 1 }}
                onMouseEnter={(e) => {
                  if (event.durationHours > 0)
                    setTooltip({ event, x: e.currentTarget.getBoundingClientRect().left });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <div
                  className={`w-full max-w-[28px] rounded-sm transition-colors ${
                    event.triggered
                      ? "bg-gradient-to-t from-frost-blue-deep to-frost-blue"
                      : event.durationHours > 0
                        ? "bg-text-tertiary/50"
                        : "bg-text-tertiary/20"
                  }`}
                  style={{ height: barHeight }}
                />
                <span className="text-[10px] font-mono text-text-tertiary">
                  {String(event.year).slice(-2)}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-2 text-xs shadow-xl z-50 whitespace-nowrap pointer-events-none">
            <p className="text-text-primary font-medium">
              {new Date(tooltip.event.date).toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="text-text-secondary mt-0.5">
              <span className="font-mono text-frost-blue">
                {tooltip.event.minTemp.toFixed(1)}°C
              </span>{" "}
              for {tooltip.event.durationHours}h
              {tooltip.event.triggered && (
                <span className="text-accent-amber ml-1">
                  &middot; Est. loss: &euro;
                  {Math.round(tooltip.event.estimatedLoss).toLocaleString()}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
