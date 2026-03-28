"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ParametricContract } from "@/types";

interface PayoutNotificationProps {
  contract: ParametricContract;
  minTemp: number;
  breachHours: number;
}

/** Animate a number from 0 to target */
function useCountUp(target: number, duration: number = 800, delay: number = 0) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);
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

export default function PayoutNotification({
  contract,
  minTemp,
  breachHours,
}: PayoutNotificationProps) {
  const animatedAmount = useCountUp(contract.payoutPerHectare, 800, 600);
  const [showDetails, setShowDetails] = useState(false);
  const [showFooter, setShowFooter] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowDetails(true), 300);
    const t2 = setTimeout(() => setShowFooter(true), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center px-6 pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-[400px] bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl p-6 shadow-2xl border-l-[3px] border-l-success-green"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        {/* Confirmed header */}
        <motion.div
          className="flex items-center gap-3 mb-5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="w-8 h-8 rounded-full bg-success-green/20 flex items-center justify-center">
            <Check className="w-4 h-4 text-success-green" />
          </div>
          <p className="text-text-primary font-medium">
            Frost event confirmed
          </p>
          <span className="ml-auto text-[10px] font-mono text-text-tertiary border border-white/15 px-1.5 py-0.5 rounded">
            DEMO
          </span>
        </motion.div>

        {/* Event details */}
        {showDetails && (
          <motion.div
            className="mb-5 space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-text-secondary text-sm">
              <span className="font-mono text-frost-blue">
                {minTemp.toFixed(1)}°C
              </span>{" "}
              for {breachHours}+ hours detected
            </p>
            <p className="text-text-tertiary text-sm">
              April 14, 2026 &middot; Kyustendil region
            </p>
          </motion.div>
        )}

        {/* Payout amount — the star */}
        <div className="mb-1">
          <p className="text-text-tertiary text-xs uppercase tracking-widest mb-1">
            Payout
          </p>
          <p className="font-mono text-5xl font-bold text-success-green leading-none tabular-nums">
            &euro;{animatedAmount.toFixed(2)}
            <span className="text-lg text-text-tertiary font-normal ml-1">/ha</span>
          </p>
        </div>
        <p className="text-text-secondary text-sm mb-5">
          Sent to account ending &bull;&bull;&bull;4821
        </p>

        {/* Footer */}
        {showFooter && (
          <motion.p
            className="text-text-tertiary text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Processed automatically &middot; No claim filed
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
