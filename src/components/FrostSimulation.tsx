"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import type { ParametricContract } from "@/types";
import { generateSimulationData } from "@/lib/frostAnalysis";
import { useLocale } from "@/lib/i18n";
import TemperatureGauge from "./TemperatureGauge";
import PayoutNotification from "./PayoutNotification";
import WhatsAppMock from "./WhatsAppMock";

interface FrostSimulationProps {
  contract: ParametricContract;
  onExit: () => void;
}

type SimPhase = "darkening" | "coldfront" | "tempdrop" | "counting" | "payout";

export default function FrostSimulation({ contract, onExit }: FrostSimulationProps) {
  const { t } = useLocale();
  const [phase, setPhase] = useState<SimPhase>("darkening");
  const [temperature, setTemperature] = useState(4.2); // Real start: 4.2°C at sunset
  const [breachHours, setBreachHours] = useState(0);
  const [showGauge, setShowGauge] = useState(false);
  const [showColdFront, setShowColdFront] = useState(false);
  const [breached, setBreached] = useState(false);
  const [triggerFired, setTriggerFired] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showVignette, setShowVignette] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [minTemp, setMinTemp] = useState(4.2);
  const [simTime, setSimTime] = useState(""); // Current timestamp label

  const simData = useRef(generateSimulationData(contract));
  const animFrame = useRef(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timeouts.current.push(setTimeout(fn, ms));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
      cancelAnimationFrame(animFrame.current);
    };
  }, []);

  // Orchestrate the 5-phase sequence
  useEffect(() => {
    const data = simData.current;
    const threshold = contract.threshold;

    // Phase 1: Darkening (0–1.5s) — handled by parent dimming overlay
    setPhase("darkening");

    // Phase 2: Cold front sweep (1.5–4s)
    schedule(() => {
      setPhase("coldfront");
      setShowColdFront(true);
      setShowGauge(true);
    }, 1500);

    schedule(() => {
      setShowColdFront(false);
    }, 4000);

    // Phase 3: Temperature drop (4–12s)
    // Step through all 19 real data points from the Kyustendil 2025 event
    // Apr 7 18:00 (4.2°C) → Apr 8 06:00 (-3.1°C) → Apr 8 12:00 (6.2°C)
    schedule(() => {
      setPhase("tempdrop");
      const interval = 8000 / data.length; // ~420ms per hour
      let idx = 0;
      let hoursBelow = 0;
      let triggered = false;

      const stepTemp = () => {
        if (idx >= data.length) return;
        const point = data[idx];
        const temp = point.temperature;

        // Format time label: "Apr 7, 22:00" from "2025-04-07T22:00"
        const d = new Date(point.time);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
          ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        setSimTime(label);
        setTemperature(temp);
        setMinTemp((prev) => Math.min(prev, temp));

        // Track threshold crossing
        if (temp < threshold) {
          if (!breached) {
            setBreached(true);
            setShowVignette(true);
            setTimeout(() => setShowVignette(false), 500);
          }
          hoursBelow++;
          setBreachHours(hoursBelow);

          // Check trigger
          if (hoursBelow >= contract.durationThreshold && !triggered) {
            triggered = true;
            setTriggerFired(true);
            setPhase("counting");
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 100);
          }
        }

        idx++;
        if (idx < data.length) {
          timeouts.current.push(setTimeout(stepTemp, interval));
        } else {
          // All points done → show payout
          timeouts.current.push(setTimeout(() => {
            setPhase("payout");
            setShowGauge(false);
            setShowPayout(true);
          }, 1500));
        }
      };

      stepTemp();
    }, 4000);

    // WhatsApp notification 2s after payout card appears
    schedule(() => {
      setShowWhatsApp(true);
    }, 15500);

    // Auto-dismiss WhatsApp after 5s
    schedule(() => {
      setShowWhatsApp(false);
    }, 20500);
  }, [contract, schedule, breached]);

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">

      {/* Exit button — always visible */}
      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5
                   bg-bg-secondary/80 backdrop-blur-md border border-border-subtle
                   rounded-lg text-text-secondary text-xs hover:text-text-primary
                   hover:bg-bg-secondary transition-all cursor-pointer pointer-events-auto"
      >
        <X className="w-3 h-3" />
        {t("sim.exit")}
      </button>

      {/* Context label — visible during early phases */}
      <AnimatePresence>
        {(phase === "darkening" || phase === "coldfront") && (
          <motion.div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="px-3 py-1.5 bg-bg-secondary/80 backdrop-blur-md border border-border-subtle rounded-lg">
              <p className="text-text-tertiary text-xs uppercase tracking-widest">
                {t("sim.title")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen dim */}
      <motion.div
        className="absolute inset-0"
        initial={{ backgroundColor: "rgba(0,0,0,0)" }}
        animate={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        transition={{ duration: 1.5 }}
      />

      {/* Cold blue gradient creeping from edges */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase !== "darkening" ? 1 : 0 }}
        transition={{ duration: 2 }}
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, #0288D140 100%)",
        }}
      />

      {/* Cold front sweep */}
      <AnimatePresence>
        {showColdFront && (
          <motion.div
            className="absolute inset-0"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #4FC3F722 30%, #4FC3F744 50%, #4FC3F722 70%, transparent 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Red vignette flash on threshold crossing */}
      <AnimatePresence>
        {showVignette && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              boxShadow: "inset 0 0 100px var(--color-danger-red-glow)",
            }}
          />
        )}
      </AnimatePresence>

      {/* White flash on trigger */}
      {showFlash && (
        <div className="absolute inset-0 bg-white/10" />
      )}

      {/* Trigger pulse from map center */}
      <AnimatePresence>
        {triggerFired && !showPayout && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-amber"
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 400, height: 400, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Temperature gauge */}
      <TemperatureGauge
        temperature={temperature}
        threshold={contract.threshold}
        visible={showGauge}
        breached={breached}
      />

      {/* Duration counter */}
      <AnimatePresence>
        {(phase === "counting" || phase === "tempdrop") && !showPayout && (
          <motion.div
            className="absolute right-6 top-[calc(50%+180px)] z-40 text-right"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {simTime && (
              <p className="text-frost-blue text-xs font-mono mb-2">{simTime}</p>
            )}
            <p className="text-text-tertiary text-xs uppercase tracking-wider mb-1">
              {t("sim.hoursBelow")} {contract.threshold}°C
            </p>
            <p className="font-mono text-3xl font-bold tabular-nums">
              <span className={triggerFired ? "text-accent-amber" : "text-text-primary"}>
                {breachHours}h
              </span>
              <span className="text-text-tertiary text-lg">
                {" "}
                / {contract.durationThreshold}h
              </span>
            </p>
            {triggerFired && (
              <motion.p
                className="text-accent-amber text-sm font-semibold uppercase tracking-wider mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {t("sim.triggered")}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payout card */}
      <AnimatePresence>
        {showPayout && (
          <PayoutNotification
            contract={contract}
            minTemp={minTemp}
            breachHours={breachHours}
          />
        )}
      </AnimatePresence>

      {/* WhatsApp notification */}
      <AnimatePresence>
        {showWhatsApp && (
          <WhatsAppMock amount={contract.payoutPerHectare} />
        )}
      </AnimatePresence>

      {/* Restart CTA — appears after simulation completes */}
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
              className="flex items-center gap-2 px-5 py-2.5 bg-bg-secondary/90 backdrop-blur-md
                         border border-border-subtle rounded-xl text-text-secondary text-sm
                         hover:text-text-primary hover:bg-bg-secondary transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("sim.restart")}
            </button>
            <button
              className="px-5 py-2.5 bg-accent-amber text-bg-primary rounded-xl text-sm
                         font-semibold hover:brightness-110 transition-all cursor-pointer"
            >
              {t("sim.insure")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
