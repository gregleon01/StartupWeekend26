"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Check, FileText, Clock, Thermometer, MapPin } from "lucide-react";
import type { ParametricContract } from "@/types";

interface PayoutNotificationProps {
  contract: ParametricContract;
  minTemp: number;
  breachHours: number;
  locationLabel?: string;
}

function useCountUp(target: number, duration: number = 800, delay: number = 0) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        setValue(target * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame.current); };
  }, [target, duration, delay]);
  return value;
}

export default function PayoutNotification({
  contract,
  minTemp,
  breachHours,
  locationLabel = "Kyustendil, BG",
}: PayoutNotificationProps) {
  const animatedAmount = useCountUp(contract.payoutPerHectare, 1000, 500);
  const [revealed, setRevealed] = useState(0); // 0-4 reveal stages

  useEffect(() => {
    const timers = [
      setTimeout(() => setRevealed(1), 200),
      setTimeout(() => setRevealed(2), 600),
      setTimeout(() => setRevealed(3), 1200),
      setTimeout(() => setRevealed(4), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg)";
  };

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center px-6 pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-[380px] bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl
                   shadow-2xl overflow-hidden transition-transform duration-150 ease-out"
        style={{ transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ y: 60, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 180 }}
      >
        {/* Green success stripe */}
        <div className="h-1 bg-success-green" />

        <div className="px-6 py-5">
          {/* Header */}
          <motion.div
            className="flex items-center gap-3 mb-5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-10 h-10 rounded-full bg-success-green/15 border border-success-green/30 flex items-center justify-center">
              <Check className="w-5 h-5 text-success-green" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Payout Approved</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Automatic · No claim filed</p>
            </div>
          </motion.div>

          {/* Divider — dashed like a receipt */}
          <div className="border-t border-dashed border-white/15 my-4" />

          {/* Receipt items */}
          {revealed >= 1 && (
            <motion.div
              className="space-y-2.5 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ReceiptRow icon={<FileText className="w-3 h-3" />} label="Contract" value={contract.crop} />
              <ReceiptRow icon={<Thermometer className="w-3 h-3" />} label="Min. temperature" value={`${minTemp.toFixed(1)}°C`} highlight />
              <ReceiptRow icon={<Clock className="w-3 h-3" />} label="Duration below threshold" value={`${breachHours}h (req: ${contract.durationThreshold}h)`} />
              <ReceiptRow icon={<MapPin className="w-3 h-3" />} label="Region" value={locationLabel} />
            </motion.div>
          )}

          {/* Divider */}
          <div className="border-t border-dashed border-white/15 my-4" />

          {/* Payout amount */}
          {revealed >= 2 && (
            <motion.div
              className="text-center my-5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Payout per hectare</p>
              <p className="font-mono text-5xl font-bold text-success-green leading-none tabular-nums">
                €{animatedAmount.toFixed(0)}
              </p>
            </motion.div>
          )}

          {/* Divider */}
          <div className="border-t border-dashed border-white/15 my-4" />

          {/* Footer */}
          {revealed >= 3 && (
            <motion.div
              className="flex items-center justify-between text-[10px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-white/30">Ref: AKL-2025-04-08-KYU</span>
              <span className="text-white/30">Account ···4821</span>
            </motion.div>
          )}

          {/* Timestamp */}
          {revealed >= 4 && (
            <motion.p
              className="text-center text-white/20 text-[9px] mt-3 font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Processed {new Date().toLocaleDateString("en-GB")} · Aklima Parametric Engine v1.0
            </motion.p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReceiptRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-white/40 text-xs">
        {icon}
        {label}
      </span>
      <span className={`font-mono text-xs font-medium ${highlight ? "text-frost-blue" : "text-white/80"}`}>
        {value}
      </span>
    </div>
  );
}
