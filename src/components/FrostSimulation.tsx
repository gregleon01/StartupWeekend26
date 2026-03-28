"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ParametricContract } from "@/types";
import { generateSimulationData } from "@/lib/frostAnalysis";
import TemperatureGauge from "./TemperatureGauge";
import PayoutNotification from "./PayoutNotification";
import WhatsAppMock from "./WhatsAppMock";

interface FrostSimulationProps {
  contract: ParametricContract;
}

type SimPhase = "darkening" | "coldfront" | "tempdrop" | "counting" | "payout";

export default function FrostSimulation({ contract }: FrostSimulationProps) {
  const [phase, setPhase] = useState<SimPhase>("darkening");
  const [temperature, setTemperature] = useState(4);
  const [breachHours, setBreachHours] = useState(0);
  const [showGauge, setShowGauge] = useState(false);
  const [showColdFront, setShowColdFront] = useState(false);
  const [breached, setBreached] = useState(false);
  const [triggerFired, setTriggerFired] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showVignette, setShowVignette] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [minTemp, setMinTemp] = useState(4);

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

    // Phase 3: Temperature drop (4–8s)
    // Animate through the first 12 data points (cooling + breach start)
    schedule(() => {
      setPhase("tempdrop");
      const dropPoints = data.slice(0, 12); // 4h cooling + 8h breach
      const interval = 4000 / dropPoints.length; // ~333ms each
      let idx = 0;

      const stepTemp = () => {
        if (idx >= dropPoints.length) return;
        const temp = dropPoints[idx].temperature;
        setTemperature(temp);
        setMinTemp((prev) => Math.min(prev, temp));

        // Check threshold crossing
        if (temp < threshold && !breached) {
          setBreached(true);
          setShowVignette(true);
          setTimeout(() => setShowVignette(false), 500);
        }

        idx++;
        if (idx < dropPoints.length) {
          timeouts.current.push(setTimeout(stepTemp, interval));
        }
      };

      stepTemp();
    }, 4000);

    // Phase 4: Duration counter (8–11s)
    schedule(() => {
      setPhase("counting");
      setBreached(true);

      // Count up hours
      for (let h = 1; h <= contract.durationThreshold; h++) {
        schedule(() => {
          setBreachHours(h);

          if (h >= contract.durationThreshold) {
            // TRIGGER FIRED
            setTriggerFired(true);
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 100);
          }
        }, h * 600);
      }
    }, 8000);

    // Phase 5: Payout (11–13s)
    schedule(() => {
      setPhase("payout");
      setShowGauge(false);
      setShowPayout(true);
    }, 11500);

    // WhatsApp notification 1s after payout card
    schedule(() => {
      setShowWhatsApp(true);
    }, 12500);

    // Auto-dismiss WhatsApp after 5s
    schedule(() => {
      setShowWhatsApp(false);
    }, 17500);
  }, [contract, schedule, breached]);

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
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
            <p className="text-text-tertiary text-xs uppercase tracking-wider mb-1">
              Hours below {contract.threshold}°C
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
                Trigger Activated
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
    </div>
  );
}
