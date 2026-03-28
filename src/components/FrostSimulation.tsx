"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Thermometer, Clock } from "lucide-react";
import type { ParametricContract } from "@/types";
import { generateSimulationData } from "@/lib/frostAnalysis";
import { useLocale } from "@/lib/i18n";
import PayoutNotification from "./PayoutNotification";

interface FrostSimulationProps {
  contract: ParametricContract;
  onExit: () => void;
}

export default function FrostSimulation({ contract, onExit }: FrostSimulationProps) {
  const { t } = useLocale();
  const [temperature, setTemperature] = useState(4.2);
  const [breachHours, setBreachHours] = useState(0);
  const [simTime, setSimTime] = useState("");
  const [breached, setBreached] = useState(false);
  const [triggerFired, setTriggerFired] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [minTemp, setMinTemp] = useState(4.2);
  const [progress, setProgress] = useState(0);

  const simData = useRef(generateSimulationData(contract));
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timeouts.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  // Run simulation — step through real Kyustendil data
  useEffect(() => {
    const data = simData.current;
    const threshold = contract.threshold;
    const interval = 250; // ms per data point (~5s total for 19 points)
    let hoursBelow = 0;
    let triggered = false;

    data.forEach((point, idx) => {
      schedule(() => {
        const temp = point.temperature;
        const d = new Date(point.time);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
          " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

        setSimTime(label);
        setTemperature(temp);
        setMinTemp((prev) => Math.min(prev, temp));
        setProgress((idx + 1) / data.length);

        if (temp < threshold) {
          if (!breached) setBreached(true);
          hoursBelow++;
          setBreachHours(hoursBelow);
          if (hoursBelow >= contract.durationThreshold && !triggered) {
            triggered = true;
            setTriggerFired(true);
          }
        }

        // Last point → show payout
        if (idx === data.length - 1) {
          schedule(() => setShowPayout(true), 600);
        }
      }, 800 + idx * interval); // Start after 0.8s
    });
  }, [contract, schedule, breached]);

  const tempColor = breached
    ? triggerFired ? "text-danger-red" : "text-frost-blue"
    : "text-white";

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      {/* Full-screen dim */}
      <motion.div
        className="absolute inset-0 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />

      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-50 flex items-center gap-1.5 px-4 py-2
                   bg-white/8 backdrop-blur-xl border border-white/12 rounded-full
                   text-white/60 text-xs hover:text-white hover:bg-white/14
                   transition-all cursor-pointer pointer-events-auto shadow-xl"
      >
        <X className="w-3 h-3" />
        {t("sim.exit")}
      </button>

      {/* Title chip */}
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="px-5 py-2 bg-white/8 backdrop-blur-xl border border-white/12 rounded-full shadow-xl">
          <p className="text-white text-sm font-medium">
            {t("sim.title")} · Kyustendil, April 2025
          </p>
        </div>
      </motion.div>

      {/* Live monitoring card — centered */}
      <AnimatePresence>
        {!showPayout && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-full max-w-[420px] bg-white/8 backdrop-blur-2xl border border-white/12 rounded-3xl p-6 shadow-2xl">
              {/* Progress bar */}
              <div className="h-1 bg-white/6 rounded-full mb-5 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${triggerFired ? "bg-danger-red" : "bg-accent-amber"}`}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Time label */}
              <p className="text-white/40 text-xs font-mono text-center mb-6">{simTime || "Starting..."}</p>

              {/* Temperature — big centered number */}
              <div className="text-center mb-6">
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">
                  Current Temperature
                </p>
                <motion.p
                  className={`font-mono text-6xl font-bold tabular-nums leading-none ${tempColor}`}
                  key={temperature}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  {temperature.toFixed(1)}°C
                </motion.p>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-3.5 h-3.5 text-white/30" />
                  <div>
                    <p className="text-white/30 text-[9px] uppercase">Threshold</p>
                    <p className="font-mono text-white/70 text-sm">{contract.threshold}°C</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white/30" />
                  <div>
                    <p className="text-white/30 text-[9px] uppercase">Hours below</p>
                    <p className={`font-mono text-sm font-bold ${triggerFired ? "text-accent-amber" : "text-white/70"}`}>
                      {breachHours}h / {contract.durationThreshold}h
                    </p>
                  </div>
                </div>
              </div>

              {/* Trigger status */}
              <div className="text-center">
                {triggerFired ? (
                  <motion.p
                    className="text-accent-amber text-xs font-semibold uppercase tracking-wider"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    ⚡ Trigger Activated — Payout Processing
                  </motion.p>
                ) : breached ? (
                  <p className="text-frost-blue text-xs uppercase tracking-wider">
                    Monitoring frost event...
                  </p>
                ) : (
                  <p className="text-white/30 text-xs uppercase tracking-wider">
                    Monitoring conditions
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payout receipt */}
      <AnimatePresence>
        {showPayout && (
          <PayoutNotification
            contract={contract}
            minTemp={minTemp}
            breachHours={breachHours}
          />
        )}
      </AnimatePresence>

      {/* Restart CTA */}
      <AnimatePresence>
        {showPayout && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-3 pointer-events-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5 }}
          >
            <button
              onClick={onExit}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/8 backdrop-blur-xl
                         border border-white/12 rounded-full text-white/70 text-sm
                         hover:text-white hover:bg-white/14 transition-all cursor-pointer shadow-xl"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("sim.restart")}
            </button>
            <button
              className="px-5 py-2.5 bg-accent-amber text-bg-primary rounded-full text-sm
                         font-semibold hover:brightness-110 transition-all cursor-pointer shadow-xl"
            >
              {t("sim.insure")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
