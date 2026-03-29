"use client";

import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, TrendingUp, MapPin, AlertTriangle, Banknote, BarChart3,
  Radio, ArrowLeft, Activity, Layers, Zap, CheckCircle, XCircle,
  ThermometerSnowflake, Eye, Droplets,
} from "lucide-react";
import Link from "next/link";
import { generateMockFields, computeFieldStats } from "@/lib/mockFields";
import { computePortfolioRisk } from "@/lib/statistics";
import { contracts } from "@/lib/contracts";
import { usePortfolioWeather } from "@/hooks/usePortfolioWeather";
import type { CropKey, MockField } from "@/types";
import InsuredFieldsMap from "@/components/InsuredFieldsMap";

function useCountUp(target: number, dur = 1200, delay = 0) {
  const [v, setV] = useState(0);
  const f = useRef(0);
  useEffect(() => {
    const to = setTimeout(() => {
      const s = performance.now();
      const tick = (n: number) => {
        const p = Math.min((n - s) / dur, 1);
        setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) f.current = requestAnimationFrame(tick);
      };
      f.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(to); cancelAnimationFrame(f.current); };
  }, [target, dur, delay]);
  return v;
}

const CROP_COLORS: Record<CropKey, string> = {
  cherries: "#EF5350", grapes: "#AB47BC", wheat: "#F5A623", sunflower: "#66BB6A",
};
const MW: Record<CropKey, number[]> = {
  cherries: [0,0,0,.2,.6,.2,0,0,0,0,0,0], grapes: [0,0,0,.1,.5,.4,0,0,0,0,0,0],
  wheat: [0,0,.3,.5,.2,0,0,0,0,0,0,0], sunflower: [0,0,0,0,.3,.5,.2,0,0,0,0,0],
};
const MO = ["J","F","M","A","M","J","J","A","S","O","N","D"];
const ACTIVITY_TIMES = ["2h","2h","3h","3h","4h","4h","5h","5h"];

function monthlyTriggers(fields: MockField[]) {
  const t = fields.filter(f => f.payoutTriggered);
  const c = new Array(12).fill(0);
  for (const f of t) { const w = MW[f.crop]; for (let m=0;m<12;m++) c[m] += w[m]*f.hectares; }
  return c;
}

function cropBreakdown(fields: MockField[]) {
  const t = fields.filter(f => f.payoutTriggered);
  return (["cherries","grapes","wheat","sunflower"] as CropKey[]).map(crop => {
    const cf = t.filter(f => f.crop === crop);
    const total = cf.reduce((s,f) => s + f.payoutAmount*f.hectares, 0);
    const covered = fields.filter(f => f.crop === crop && f.covered);
    return { crop, total, count: cf.length, ha: Math.round(covered.reduce((s,f) => s+f.hectares, 0)), fields: covered.length };
  });
}

export default function AdminPage() {
  const { triggerRates, loading: wl, isLiveData } = usePortfolioWeather();
  const fields = useMemo(() => generateMockFields(triggerRates), [triggerRates]);
  const stats = useMemo(() => computeFieldStats(fields), [fields]);
  const portfolio = useMemo(() => computePortfolioRisk(fields, triggerRates), [fields, triggerRates]);
  const crops = useMemo(() => cropBreakdown(fields), [fields]);
  const months = useMemo(() => monthlyTriggers(fields), [fields]);
  const maxCrop = Math.max(...crops.map(d => d.total), 1);
  const maxMo = Math.max(...months, 1);

  const activity = useMemo(() =>
    fields.filter(f => f.payoutTriggered).slice(0, ACTIVITY_TIMES.length).map((f, i) => ({
      id: f.id, crop: f.crop, amount: f.payoutAmount, ha: f.hectares,
      time: ACTIVITY_TIMES[i] ?? "5h",
    })), [fields]);

  const aF = useCountUp(fields.length, 1200, 200);
  const aH = useCountUp(stats.hectaresCovered, 1200, 300);
  const aP = useCountUp(stats.premiumsCollected, 1200, 400);
  const aT = useCountUp(stats.payoutsTriggered, 1200, 500);
  const aPd = useCountUp(stats.totalPaidOut, 1200, 600);

  const lr = stats.premiumsCollected > 0 ? stats.totalPaidOut / stats.premiumsCollected : 0;
  const lrC = lr < .6 ? "text-success-green" : lr < 1 ? "text-accent-amber" : "text-danger-red";
  const lrL = lr < .6 ? "Healthy" : lr < 1 ? "Moderate" : "Unprofitable";
  const covRate = fields.length ? Math.round(fields.filter(f => f.covered).length / fields.length * 100) : 0;

  const trend = useMemo(() => {
    const base = portfolio.expectedAnnualPayout;
    const w = [.55,.70,.85,1.05,.90,1.10];
    return [2020,2021,2022,2023,2024,2025].map((y,i) => ({ y, v: Math.round(base*w[i]) }));
  }, [portfolio.expectedAnnualPayout]);
  const avg5 = Math.round(trend.slice(0, 5).reduce((s,t) => s+t.v, 0) / 5);

  const [claimStatus, setCS] = useState<Record<number, "a"|"r">>({});
  const [simPhase, setSimPhase] = useState<"idle"|"running"|"done">("idle");
  const [simRevealedIds, setSimRevealedIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"claims"|"risk"|"forecast">("claims");
  const simTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const triggeredSorted = useMemo(() =>
    fields.filter(f => f.payoutTriggered).sort((a, b) => a.lng - b.lng),
  [fields]);

  useEffect(() => () => { simTimers.current.forEach(t => clearTimeout(t)); }, []);

  const doSim = useCallback(() => {
    if (simPhase === "running") return;
    if (simPhase === "done") {
      setSimPhase("idle");
      setSimRevealedIds([]);
      return;
    }
    setSimPhase("running");
    setSimRevealedIds([]);
    setActiveTab("claims");
    simTimers.current.forEach(t => clearTimeout(t));
    simTimers.current = [];
    const total = triggeredSorted.length;
    const duration = 5000;
    triggeredSorted.forEach((field, i) => {
      const delay = total <= 1 ? 0 : (i / (total - 1)) * duration;
      const t = setTimeout(() => {
        setSimRevealedIds(prev => [...prev, field.id]);
      }, delay);
      simTimers.current.push(t);
    });
    const done = setTimeout(() => setSimPhase("done"), duration + 600);
    simTimers.current.push(done);
  }, [simPhase, triggeredSorted]);

  const simProgress = simPhase === "running"
    ? simRevealedIds.length / Math.max(triggeredSorted.length, 1)
    : simPhase === "done" ? 1 : 0;

  const displayTriggered = simPhase !== "idle" ? simRevealedIds.length : stats.payoutsTriggered;
  const displayPaidOut = simPhase !== "idle"
    ? Math.round(simRevealedIds.reduce((sum, id) => {
        const f = fields.find(x => x.id === id);
        return sum + (f ? f.payoutAmount * f.hectares : 0);
      }, 0))
    : stats.totalPaidOut;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary">

      {/* Map — full screen */}
      <div className="absolute inset-0">
        <InsuredFieldsMap fields={fields} simulatedTriggerIds={simRevealedIds} />
      </div>

      {/* Frost simulation sweep overlay */}
      <AnimatePresence>
        {simPhase !== "idle" && (
          <motion.div className="absolute inset-0 z-20 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-frost-blue/5" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
              <motion.div className="h-full bg-frost-blue" style={{ width: `${simProgress * 100}%` }}
                transition={{ duration: 0.1 }} />
            </div>
            {simPhase === "running" && (
              <motion.div
                className="absolute top-0 bottom-0 w-0.5 bg-frost-blue/40"
                style={{ left: `${simProgress * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-left nav */}
      <Link href="/"
        className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-4 py-2
                   bg-white/8 backdrop-blur-xl border border-white/12 rounded-full
                   text-white/60 text-xs hover:text-white hover:bg-white/14 transition-all shadow-xl outline-none">
        <ArrowLeft className="w-3 h-3" /> Aklima
      </Link>

      {/* Top-center title pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-3 px-5 py-2 bg-white/8 backdrop-blur-xl border border-white/12 rounded-full shadow-xl">
          <Shield className="w-4 h-4 text-accent-amber" />
          <span className="text-white text-sm font-medium">Portfolio Command</span>
          <span className="text-white/20">·</span>
          <span className="text-white/50 text-xs">Bulgaria</span>
          <span className="text-white/20">·</span>
          {wl ? (
            <span className="text-white/40 text-xs animate-pulse">Syncing…</span>
          ) : (
            <span className={`flex items-center gap-1 text-xs ${isLiveData ? "text-success-green" : "text-white/40"}`}>
              <Radio className="w-3 h-3" /> {isLiveData ? "Live" : "Offline"}
            </span>
          )}
        </div>
      </div>

      {/* Right-side glass panel */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-[360px] z-30
                   bg-white/8 backdrop-blur-2xl border-l border-white/10 shadow-2xl
                   flex flex-col"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{ type: "tween", duration: 0.4, ease: "easeOut", delay: 0.1 }}
      >
        {/* Stats grid */}
        <div className="px-5 pt-16 pb-4 border-b border-white/8">
          <p className="text-white/30 text-[9px] uppercase tracking-widest mb-3">Portfolio Overview</p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={<MapPin className="w-3.5 h-3.5" />} label="Fields" value={aF.toLocaleString()} />
            <StatCard icon={<MapPin className="w-3.5 h-3.5" />} label="Hectares" value={aH.toLocaleString()} suffix="ha" />
            <StatCard icon={<Banknote className="w-3.5 h-3.5" />} label="Premiums" value={`€${aP.toLocaleString()}`} color="text-accent-amber" />
            <StatCard
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              label="Triggered"
              value={simPhase !== "idle" ? displayTriggered.toLocaleString() : aT.toLocaleString()}
              color={simPhase !== "idle" ? "text-danger-red animate-pulse" : "text-danger-red"}
            />
          </div>
          <div className="mt-2 flex items-center justify-between p-2.5 bg-white/4 border border-white/6 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-white/30" />
              <span className="text-white/50 text-xs">Total Paid Out</span>
            </div>
            <span className={`font-mono text-sm font-bold text-danger-red ${simPhase === "running" ? "animate-pulse" : ""}`}>
              €{(simPhase !== "idle" ? displayPaidOut : aPd).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-white/30" />
              <span className="text-white/40 text-xs">Loss Ratio</span>
            </div>
            <span className={`font-mono text-sm font-bold ${lrC}`}>
              {Math.round(lr*100)}% <span className={`text-[9px] font-medium uppercase ${lrC}`}>{lrL}</span>
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/8">
          {([
            { id: "claims" as const, icon: <CheckCircle className="w-3 h-3" />, label: "Claims", count: simPhase !== "idle" ? simRevealedIds.length : activity.length },
            { id: "risk" as const, icon: <Shield className="w-3 h-3" />, label: "Risk" },
            { id: "forecast" as const, icon: <TrendingUp className="w-3 h-3" />, label: "Forecast" },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer outline-none ${
                activeTab === tab.id ? "bg-white/12 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/6"
              }`}>
              {tab.icon} {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === tab.id ? "bg-accent-amber text-bg-primary" : "bg-white/10 text-white/40"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {activeTab === "claims" && (
              <motion.div key="claims" className="p-4 space-y-2"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                {simPhase !== "idle" && (
                  <div className={`mb-3 p-2.5 rounded-xl border ${simPhase === "running" ? "bg-frost-blue/8 border-frost-blue/25" : "bg-danger-red/8 border-danger-red/25"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${simPhase === "running" ? "text-frost-blue animate-pulse" : "text-danger-red"}`}>
                        {simPhase === "running" ? "⚡ Frost Event Sweeping…" : "❄ Frost Event Complete"}
                      </span>
                      <span className="text-white/40 text-[10px] font-mono">
                        {simRevealedIds.length}/{triggeredSorted.length}
                      </span>
                    </div>
                    <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full ${simPhase === "running" ? "bg-frost-blue" : "bg-danger-red"}`}
                        style={{ width: `${simProgress * 100}%` }} transition={{ duration: 0.1 }} />
                    </div>
                  </div>
                )}

                {simPhase !== "idle" ? (
                  simRevealedIds.length === 0 ? (
                    <p className="text-white/25 text-xs text-center py-8">Waiting for frost front…</p>
                  ) : (
                    [...simRevealedIds].reverse().map((id) => {
                      const field = fields.find(f => f.id === id);
                      if (!field) return null;
                      const st = claimStatus[field.id];
                      return (
                        <motion.div key={field.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            st === "a" ? "bg-success-green/8 border-success-green/20" :
                            st === "r" ? "bg-white/2 border-white/4 opacity-40" :
                            "bg-danger-red/6 border-danger-red/20 hover:border-danger-red/35"
                          }`}
                          initial={{ opacity: 0, y: -12, scale: 0.95 }}
                          animate={{ opacity: st === "r" ? .4 : 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25 }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{contracts[field.crop]?.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-[11px] font-medium">Field #{field.id}</p>
                              <p className="text-white/30 text-[9px]">{contracts[field.crop]?.crop} · {field.hectares}ha · just now</p>
                            </div>
                            <span className="font-mono text-danger-red text-sm font-bold shrink-0">
                              €{Math.round(field.payoutAmount * field.hectares).toLocaleString()}
                            </span>
                          </div>
                          {!st ? (
                            <div className="flex gap-2">
                              <button onClick={() => setCS(p => ({...p, [field.id]: "a"}))}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-success-green/12 text-success-green
                                           text-[10px] font-semibold rounded-xl hover:bg-success-green/20 transition-all cursor-pointer">
                                <CheckCircle className="w-3 h-3" /> Approve
                              </button>
                              <button onClick={() => setCS(p => ({...p, [field.id]: "r"}))}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/6 text-white/40
                                           text-[10px] font-semibold rounded-xl hover:bg-danger-red/12 hover:text-danger-red transition-all cursor-pointer">
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          ) : (
                            <p className={`text-[10px] font-semibold uppercase tracking-wider text-center py-1 ${st === "a" ? "text-success-green" : "text-white/30"}`}>
                              {st === "a" ? "✓ Approved · Paying out" : "✗ Rejected"}
                            </p>
                          )}
                        </motion.div>
                      );
                    })
                  )
                ) : (
                  activity.map((item, i) => {
                    const st = claimStatus[item.id];
                    return (
                      <motion.div key={item.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          st === "a" ? "bg-success-green/8 border-success-green/20" :
                          st === "r" ? "bg-white/2 border-white/4 opacity-40" :
                          "bg-white/4 border-white/8 hover:border-white/15"
                        }`}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: st === "r" ? .4 : 1, x: 0 }}
                        transition={{ delay: i * .04 }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{contracts[item.crop]?.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-[11px] font-medium">Field #{item.id}</p>
                            <p className="text-white/30 text-[9px]">{contracts[item.crop]?.crop} · {item.ha}ha · {item.time} ago</p>
                          </div>
                          <span className="font-mono text-danger-red text-sm font-bold shrink-0">
                            €{Math.round(item.amount * item.ha).toLocaleString()}
                          </span>
                        </div>
                        {!st ? (
                          <div className="flex gap-2">
                            <button onClick={() => setCS(p => ({...p, [item.id]: "a"}))}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-success-green/12 text-success-green
                                         text-[10px] font-semibold rounded-xl hover:bg-success-green/20 transition-all cursor-pointer">
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button onClick={() => setCS(p => ({...p, [item.id]: "r"}))}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/6 text-white/40
                                         text-[10px] font-semibold rounded-xl hover:bg-danger-red/12 hover:text-danger-red transition-all cursor-pointer">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <p className={`text-[10px] font-semibold uppercase tracking-wider text-center py-1 ${st === "a" ? "text-success-green" : "text-white/30"}`}>
                            {st === "a" ? "✓ Approved · Paying out" : "✗ Rejected"}
                          </p>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            )}

            {activeTab === "risk" && (
              <motion.div key="risk" className="p-4 space-y-5"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                {/* Crop exposure bars */}
                <div>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Crop Exposure
                  </p>
                  {crops.map((d, i) => (
                    <div key={d.crop} className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-white/60 flex items-center gap-1.5">
                          {contracts[d.crop]?.icon} {contracts[d.crop]?.crop}
                        </span>
                        <span className="font-mono text-white font-bold text-[11px]">€{Math.round(d.total).toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: CROP_COLORS[d.crop] }}
                          initial={{ width: 0 }} animate={{ width: `${d.total/maxCrop*100}%` }}
                          transition={{ delay: .3 + i*.1, duration: .7 }} />
                      </div>
                      <p className="text-white/25 text-[9px] mt-0.5">{d.fields} fields · {d.ha}ha · {d.count} triggered</p>
                    </div>
                  ))}
                </div>

                {/* Crop distribution donut */}
                <div>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Eye className="w-3 h-3" /> Crop Distribution
                  </p>
                  {(() => {
                    const totalHa = crops.reduce((s,d) => s + d.ha, 0) || 1;
                    let cum = 0;
                    const r = 50, cx = 60, cy = 60;
                    return (
                      <div className="flex items-center gap-4">
                        <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
                          {crops.map((d, i) => {
                            const pct = d.ha / totalHa;
                            const start = cum * 2 * Math.PI - Math.PI/2;
                            cum += pct;
                            const end = cum * 2 * Math.PI - Math.PI/2;
                            const large = pct > .5 ? 1 : 0;
                            const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
                            const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
                            return (
                              <motion.path key={d.crop}
                                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                                fill={CROP_COLORS[d.crop]} opacity={.85}
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ delay: .2 + i*.1, duration: .5 }}
                                style={{ transformOrigin: `${cx}px ${cy}px` }} />
                            );
                          })}
                          <circle cx={cx} cy={cy} r={28} fill="rgba(10,15,28,0.85)" />
                          <text x={cx} y={cy-3} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="monospace">{totalHa}</text>
                          <text x={cx} y={cy+9} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">hectares</text>
                        </svg>
                        <div className="flex flex-col gap-1.5">
                          {crops.map(d => (
                            <div key={d.crop} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CROP_COLORS[d.crop] }} />
                              <span className="text-white/50 text-[10px]">{contracts[d.crop]?.crop}</span>
                              <span className="text-white/25 text-[10px] ml-auto">{Math.round(d.ha/totalHa*100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Monthly triggers chart */}
                <div>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3" /> Monthly Triggers
                  </p>
                  <svg width="100%" viewBox="0 0 312 120" preserveAspectRatio="xMidYMid meet">
                    {months.map((c, i) => {
                      const bw=20, gap=6, ch=95, x=i*(bw+gap), h=(c/maxMo)*ch, active=c>0;
                      return (
                        <g key={i}>
                          <rect x={x} y={0} width={bw} height={ch} rx={4} fill="rgba(255,255,255,0.03)" />
                          <motion.rect x={x} width={bw} rx={4}
                            fill={active ? "#F5A623" : "transparent"} opacity={active ? .85 : .2}
                            initial={{ height:0, y:ch }} animate={{ height:h, y:ch-h }}
                            transition={{ delay:.1+i*.04, duration:.4 }} />
                          <text x={x+bw/2} y={ch+14} textAnchor="middle"
                            fill={active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}
                            fontSize="9" fontFamily="monospace">{MO[i]}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Severity matrix — crop × month */}
                <div>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Droplets className="w-3 h-3" /> Severity Matrix
                  </p>
                  <div className="overflow-x-auto">
                    <div className="grid gap-px min-w-0" style={{ gridTemplateColumns: `56px repeat(12, 1fr)` }}>
                      <div />
                      {MO.map(m => <div key={m} className="text-center text-white/20 text-[7px] font-mono py-0.5">{m}</div>)}
                      {(["cherries","grapes","wheat","sunflower"] as CropKey[]).map(crop => (
                        <>
                          <div key={crop} className="flex items-center text-white/40 text-[9px] pr-1 truncate">
                            {contracts[crop]?.icon}
                          </div>
                          {MW[crop].map((w, mi) => (
                            <motion.div key={`${crop}-${mi}`}
                              className="rounded-sm h-5"
                              style={{ backgroundColor: w > 0 ? CROP_COLORS[crop] : "transparent", opacity: w > 0 ? .15 + w * .75 : .04 }}
                              initial={{ scale: 0 }} animate={{ scale: 1 }}
                              transition={{ delay: .1 + mi*.02 }}
                            />
                          ))}
                        </>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Portfolio metrics */}
                <div>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> Portfolio Metrics
                  </p>
                  <div className="space-y-2.5">
                    <Metric l="Total Exposure" v={`€${portfolio.totalExposure.toLocaleString()}`} />
                    <Metric l="Expected Annual" v={`€${portfolio.expectedAnnualPayout.toLocaleString()}`} />
                    <Metric l="VaR 95%" v={`€${portfolio.valueAtRisk95.toLocaleString()}`} h />
                    <Metric l="Correlation Zones" v={String(portfolio.correlationZones)} />
                    <Metric l="Diversification" v={`${Math.round(portfolio.diversificationBenefit*100)}%`} />
                    <div className="pt-1">
                      <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full bg-success-green"
                          initial={{ width: 0 }} animate={{ width: `${covRate}%` }}
                          transition={{ delay: .5, duration: .8 }} />
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">
                        <span className="font-mono text-white font-bold">{covRate}%</span> coverage
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "forecast" && (
              <motion.div key="forecast" className="p-4 space-y-5"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                <div>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> Annual Payout Trend
                  </p>
                  {(() => {
                    const W=312, H=150, pL=28, pR=8, pT=20, pB=20;
                    const cW=W-pL-pR, cH=H-pT-pB;
                    const mx = Math.max(...trend.map(d=>d.v), 1);
                    const pts = trend.map((d,i) => ({ x: pL+i/(trend.length-1)*cW, y: pT+(mx-d.v)/mx*cH }));
                    let lp = `M ${pts[0].x} ${pts[0].y}`;
                    for (let i=1; i<pts.length; i++) {
                      const cx1 = pts[i-1].x + (pts[i].x-pts[i-1].x)*.4;
                      const cx2 = pts[i].x - (pts[i].x-pts[i-1].x)*.4;
                      lp += ` C ${cx1} ${pts[i-1].y} ${cx2} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
                    }
                    const ap = `${lp} L ${pts[pts.length-1].x} ${pT+cH} L ${pts[0].x} ${pT+cH} Z`;
                    return (
                      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                        <defs>
                          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F5A623" stopOpacity=".3" />
                            <stop offset="100%" stopColor="#F5A623" stopOpacity=".02" />
                          </linearGradient>
                        </defs>
                        <path d={ap} fill="url(#tg)" />
                        <motion.path d={lp} fill="none" stroke="#F5A623" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                          initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:1.2, ease:"easeOut", delay:.2 }} />
                        {pts.map((p,i) => (
                          <g key={i}>
                            <motion.circle cx={p.x} cy={p.y} r={4} fill="#F5A623"
                              initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:.4+i*.1 }} />
                            <text x={p.x} y={p.y-10} textAnchor="middle" fontSize="9" fontFamily="monospace"
                              fill="rgba(255,255,255,0.55)" fontWeight="bold">
                              €{(trend[i].v/1000).toFixed(0)}k
                            </text>
                            <text x={p.x} y={H-3} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.2)" fontFamily="monospace">
                              &apos;{String(trend[i].y).slice(2)}
                            </text>
                          </g>
                        ))}
                      </svg>
                    );
                  })()}
                </div>

                <div>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <ThermometerSnowflake className="w-3 h-3" /> Season Forecast
                  </p>
                  <div className="space-y-2">
                    <BigMetric label="Next Season Est." value={`€${portfolio.expectedAnnualPayout.toLocaleString()}`} color="text-accent-amber" />
                    <BigMetric label="5-Year Average" value={`€${avg5.toLocaleString()}`} color="text-white" />
                    <BigMetric label="Worst Case (VaR 95%)" value={`€${portfolio.valueAtRisk95.toLocaleString()}`} color="text-danger-red" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-white/30 text-[9px] uppercase tracking-wider">Risk Indicators</p>
                  <Indicator label="Climate trend" value="Worsening" color="text-danger-red" />
                  <Indicator label="Portfolio concentration" value="Moderate" color="text-accent-amber" />
                  <Indicator label="Reinsurance capacity" value="Adequate" color="text-success-green" />
                  <Indicator label="Premium adequacy" value={lr < 1 ? "Sufficient" : "Insufficient"} color={lr < 1 ? "text-success-green" : "text-danger-red"} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom — Simulate button */}
        <div className="px-4 py-4 border-t border-white/8">
          <button onClick={doSim} disabled={simPhase === "running"}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              simPhase === "running"
                ? "bg-frost-blue/15 text-frost-blue border border-frost-blue/20 cursor-not-allowed"
                : simPhase === "done"
                ? "bg-white/8 text-white/60 border border-white/12 hover:bg-white/12 hover:text-white"
                : "bg-accent-amber/15 text-accent-amber hover:bg-accent-amber/25 border border-accent-amber/25"
            }`}>
            {simPhase === "running" ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Zap className="w-4 h-4" />
                </motion.div>
                Simulating… {Math.round(simProgress * 100)}%
              </>
            ) : simPhase === "done" ? (
              <><XCircle className="w-4 h-4" /> Reset Simulation</>
            ) : (
              <><Zap className="w-4 h-4" /> Simulate Frost Event</>
            )}
          </button>
        </div>
      </motion.div>
    </main>
  );
}

function StatCard({ icon, label, value, suffix, color = "text-white" }: {
  icon: React.ReactNode; label: string; value: string; suffix?: string; color?: string;
}) {
  return (
    <div className="p-2.5 bg-white/4 border border-white/6 rounded-xl">
      <div className="flex items-center gap-1 text-white/30 mb-1">{icon}<span className="text-[9px] uppercase tracking-wider">{label}</span></div>
      <p className={`font-mono text-base font-bold ${color}`}>
        {value}{suffix && <span className="text-white/30 text-xs font-normal ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}

function Metric({ l, v, h=false }: { l: string; v: string; h?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/35 text-[11px]">{l}</span>
      <span className={`font-mono text-[11px] font-bold ${h ? "text-accent-amber" : "text-white"}`}>{v}</span>
    </div>
  );
}

function BigMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2.5 bg-white/4 border border-white/6 rounded-xl">
      <p className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`font-mono text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Indicator({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/35 text-[10px]">{label}</span>
      <span className={`text-[10px] font-semibold ${color}`}>{value}</span>
    </div>
  );
}
