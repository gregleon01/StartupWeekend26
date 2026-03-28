"use client";

import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, TrendingUp, MapPin, AlertTriangle, Banknote, BarChart3,
  Radio, ArrowLeft, Activity, Layers, Zap, CheckCircle, XCircle,
  Eye, Users, Droplets, ThermometerSnowflake,
} from "lucide-react";
import Link from "next/link";
import { generateMockFields, computeFieldStats } from "@/lib/mockFields";
import { computePortfolioRisk } from "@/lib/statistics";
import { contracts } from "@/lib/contracts";
import { usePortfolioWeather } from "@/hooks/usePortfolioWeather";
import type { CropKey, MockField } from "@/types";
import InsuredFieldsMap from "@/components/InsuredFieldsMap";

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Data helpers                                                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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
    fields.filter(f => f.payoutTriggered).slice(0, 8).map((f, i) => ({
      id: f.id, crop: f.crop, amount: f.payoutAmount, ha: f.hectares,
      time: ACTIVITY_TIMES[i] ?? "5h",
    })), [fields]);

  const aF = useCountUp(stats.fieldsInsured, 1200, 200);
  const aH = useCountUp(stats.hectaresCovered, 1200, 350);
  const aP = useCountUp(stats.premiumsCollected, 1200, 500);
  const aT = useCountUp(stats.payoutsTriggered, 1200, 650);
  const aPd = useCountUp(stats.totalPaidOut, 1200, 800);

  const lr = stats.premiumsCollected > 0 ? stats.totalPaidOut / stats.premiumsCollected : 0;
  const lrC = lr < .6 ? "text-success-green" : lr < 1 ? "text-accent-amber" : "text-danger-red";
  const lrL = lr < .6 ? "Healthy" : lr < 1 ? "Moderate" : "Unprofitable";

  const covRate = fields.length ? Math.round(fields.filter(f => f.covered).length / fields.length * 100) : 0;

  // Payout trend (synthetic from field data)
  const trend = useMemo(() => {
    const base = fields.filter(f => f.payoutTriggered).reduce((s,f) => s + f.payoutAmount*f.hectares, 0);
    const w = [.5,.7,1.3,.8,1.1,1.0];
    return [2020,2021,2022,2023,2024,2025].map((y,i) => ({ y, v: Math.round(base/6*w[i]) }));
  }, [fields]);
  const avg5 = Math.round(trend.reduce((s,t) => s+t.v, 0) / trend.length);

  // Interactive states
  const [claimStatus, setCS] = useState<Record<number, "a"|"r">>({});
  const [simming, setSimming] = useState(false);
  const [simProg, setSimProg] = useState(0);
  const [activeTab, setActiveTab] = useState<"claims"|"risk"|"forecast">("claims");
  const [selectedField, setSelectedField] = useState<MockField | null>(null);

  const doSim = useCallback(() => {
    if (simming) return;
    setSimming(true); setSimProg(0);
    let s = 0;
    const iv = setInterval(() => {
      s++; setSimProg(s/20);
      if (s >= 20) { clearInterval(iv); setTimeout(() => { setSimming(false); setSimProg(0); }, 1500); }
    }, 150);
  }, [simming]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      {/* Map — upper portion */}
      <div className="absolute inset-0 bottom-[42vh]">
        <InsuredFieldsMap fields={fields} />
      </div>

      {/* Simulation flash overlay */}
      <AnimatePresence>
        {simming && (
          <motion.div
            className="absolute inset-0 bottom-[42vh] z-20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-frost-blue/10" />
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-1 bg-danger-red"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: simProg }}
              style={{ transformOrigin: "left" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top nav */}
      <Link href="/"
        className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-4 py-2
                   bg-white/8 backdrop-blur-xl border border-white/12 rounded-full
                   text-white/60 text-xs hover:text-white hover:bg-white/14 transition-all shadow-xl outline-none">
        <ArrowLeft className="w-3 h-3" /> Aklima
      </Link>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-3 px-5 py-2 bg-white/8 backdrop-blur-xl border border-white/12 rounded-full shadow-xl">
          <Shield className="w-4 h-4 text-accent-amber" />
          <span className="text-white text-sm font-medium">Portfolio Command</span>
          <span className="text-white/20">·</span>
          <span className="text-white/50 text-xs">Kyustendil</span>
          <span className="text-white/20">·</span>
          {wl ? <span className="text-white/40 text-xs animate-pulse">Syncing…</span> : (
            <span className={`flex items-center gap-1 text-xs ${isLiveData ? "text-success-green" : "text-white/40"}`}>
              <Radio className="w-3 h-3" /> {isLiveData ? "Live" : "Offline"}
            </span>
          )}
        </div>
      </div>

      {/* Bottom panel */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 h-[44vh] z-30 bg-white/6 backdrop-blur-2xl border-t border-white/10 shadow-2xl"
        initial={{ y: "100%" }} animate={{ y: 0 }}
        transition={{ type: "tween", duration: 0.35, ease: "easeOut", delay: 0.1 }}
      >
        {/* Stats bar */}
        <div className="flex items-center gap-4 px-6 py-2.5 border-b border-white/8 overflow-x-auto text-xs">
          <Stat icon={<Users className="w-3.5 h-3.5" />} v={aF} l="Fields" />
          <Sep /><Stat icon={<MapPin className="w-3.5 h-3.5" />} v={aH} l="ha" />
          <Sep /><Stat icon={<Banknote className="w-3.5 h-3.5" />} v={aP} l="Premiums" p="€" c="text-accent-amber" />
          <Sep /><Stat icon={<AlertTriangle className="w-3.5 h-3.5" />} v={aT} l="Triggered" c="text-danger-red" />
          <Sep /><Stat icon={<Banknote className="w-3.5 h-3.5" />} v={aPd} l="Paid" p="€" c="text-danger-red" />
          <Sep />
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Activity className="w-3.5 h-3.5 text-white/30" />
            <span className={`font-mono text-sm font-bold ${lrC}`}>{Math.round(lr*100)}%</span>
            <span className={`text-[9px] font-medium uppercase ${lrC}`}>{lrL}</span>
          </div>
          <Sep />
          <button onClick={doSim} disabled={simming}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer ${
              simming ? "bg-danger-red/20 text-danger-red animate-pulse" : "bg-accent-amber/15 text-accent-amber hover:bg-accent-amber/25"
            }`}>
            <Zap className="w-3 h-3" />
            {simming ? `${Math.round(simProg*100)}%` : "Simulate Frost"}
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-white/6">
          <Tab active={activeTab === "claims"} onClick={() => setActiveTab("claims")} icon={<CheckCircle className="w-3 h-3" />} label="Claims" count={activity.length} />
          <Tab active={activeTab === "risk"} onClick={() => setActiveTab("risk")} icon={<Shield className="w-3 h-3" />} label="Risk Analysis" />
          <Tab active={activeTab === "forecast"} onClick={() => setActiveTab("forecast")} icon={<TrendingUp className="w-3 h-3" />} label="Forecasts" />
        </div>

        {/* Tab content */}
        <div className="h-[calc(100%-88px)] overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === "claims" && (
              <motion.div key="claims" className="grid grid-cols-4 gap-3 p-5"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {activity.map((item, i) => {
                  const st = claimStatus[item.id];
                  return (
                    <motion.div key={item.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        st === "a" ? "bg-success-green/8 border-success-green/20" :
                        st === "r" ? "bg-white/2 border-white/4 opacity-40" :
                        "bg-white/4 border-white/8 hover:border-white/15"
                      }`}
                      initial={{ opacity: 0, y: 15 }} animate={{ opacity: st === "r" ? .4 : 1, y: 0 }}
                      transition={{ delay: i * .05 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{contracts[item.crop]?.icon}</span>
                        <div className="flex-1">
                          <p className="text-white text-[11px] font-medium">Field #{item.id}</p>
                          <p className="text-white/30 text-[9px]">{contracts[item.crop]?.crop} · {item.ha}ha · {item.time} ago</p>
                        </div>
                        <span className="font-mono text-danger-red text-sm font-bold">€{Math.round(item.amount * item.ha).toLocaleString()}</span>
                      </div>
                      {!st ? (
                        <div className="flex gap-2">
                          <button onClick={() => setCS(p => ({...p, [item.id]: "a"}))}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-success-green/12 text-success-green
                                       text-[10px] font-semibold rounded-xl hover:bg-success-green/20 transition-all cursor-pointer">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => setCS(p => ({...p, [item.id]: "r"}))}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/6 text-white/40
                                       text-[10px] font-semibold rounded-xl hover:bg-danger-red/12 hover:text-danger-red transition-all cursor-pointer">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <p className={`text-[10px] font-semibold uppercase tracking-wider text-center py-1.5 ${st === "a" ? "text-success-green" : "text-white/30"}`}>
                          {st === "a" ? "✓ Approved · Paying out" : "✗ Rejected"}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === "risk" && (
              <motion.div key="risk" className="grid grid-cols-3 gap-5 p-5"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Crop exposure */}
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
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
                      <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: CROP_COLORS[d.crop] }}
                          initial={{ width: 0 }} animate={{ width: `${d.total/maxCrop*100}%` }}
                          transition={{ delay: .3 + i*.1, duration: .8, ease: "easeOut" }} />
                      </div>
                      <p className="text-white/25 text-[9px] mt-0.5">{d.fields} fields · {d.ha}ha · {d.count} triggered</p>
                    </div>
                  ))}
                </div>

                {/* Monthly heatmap */}
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3" /> Monthly Triggers
                  </p>
                  <svg width="100%" height="200" viewBox="0 0 240 200" preserveAspectRatio="xMidYMid meet">
                    {months.map((c, i) => {
                      const bw=16, gap=4, ch=170, x=i*(bw+gap), h=(c/maxMo)*ch, active=c>0;
                      return (<g key={i}>
                        <rect x={x} y={0} width={bw} height={ch} rx={4} fill="rgba(255,255,255,0.03)" />
                        <motion.rect x={x} width={bw} rx={4}
                          fill={active ? "#F5A623" : "transparent"} opacity={active ? .85 : .2}
                          initial={{ height:0, y:ch }} animate={{ height:h, y:ch-h }}
                          transition={{ delay:.15+i*.04, duration:.5 }} />
                        <text x={x+bw/2} y={ch+14} textAnchor="middle"
                          fill={active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}
                          fontSize="9" fontFamily="monospace">{MO[i]}</text>
                      </g>);
                    })}
                  </svg>
                </div>

                {/* Portfolio metrics */}
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> Portfolio Metrics
                  </p>
                  <div className="space-y-3">
                    <Metric l="Total Exposure" v={`€${portfolio.totalExposure.toLocaleString()}`} />
                    <Metric l="Expected Annual" v={`€${portfolio.expectedAnnualPayout.toLocaleString()}`} />
                    <Metric l="VaR 95%" v={`€${portfolio.valueAtRisk95.toLocaleString()}`} h />
                    <Metric l="Max Possible" v={`€${portfolio.maxPossiblePayout.toLocaleString()}`} />
                    <div className="h-px bg-white/8 my-1" />
                    <Metric l="Correlation Zones" v={String(portfolio.correlationZones)} />
                    <Metric l="Diversification" v={`${Math.round(portfolio.diversificationBenefit*100)}%`} />
                    <div className="h-px bg-white/8 my-1" />
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Coverage</p>
                    <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-success-green"
                        initial={{ width: 0 }} animate={{ width: `${covRate}%` }}
                        transition={{ delay: .5, duration: .8 }} />
                    </div>
                    <p className="text-white/40 text-[10px]"><span className="font-mono text-white font-bold">{covRate}%</span> regional coverage</p>
                  </div>
                  <div className="mt-4 space-y-1">
                    {[["#66BB6A","Covered"],["#F5A623","High risk"],["#EF5350","Triggered"],["#555","Uninsured"]].map(([c,l]) => (
                      <div key={l} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                        <span className="text-white/30 text-[9px]">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "forecast" && (
              <motion.div key="forecast" className="grid grid-cols-3 gap-5 p-5"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Trend chart */}
                <div className="col-span-2">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> Annual Payout Trend
                  </p>
                  {(() => {
                    const W=440, H=180, pL=30, pR=10, pT=10, pB=24;
                    const cW=W-pL-pR, cH=H-pT-pB;
                    const mx = Math.max(...trend.map(d=>d.v),1);
                    const pts = trend.map((d,i) => ({ x: pL+i/(trend.length-1)*cW, y: pT+(mx-d.v)/mx*cH }));
                    let lp = `M ${pts[0].x} ${pts[0].y}`;
                    for (let i=1; i<pts.length; i++) {
                      const cx1 = pts[i-1].x + (pts[i].x-pts[i-1].x)*.4;
                      const cx2 = pts[i].x - (pts[i].x-pts[i-1].x)*.4;
                      lp += ` C ${cx1} ${pts[i-1].y} ${cx2} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
                    }
                    const ap = `${lp} L ${pts[pts.length-1].x} ${pT+cH} L ${pts[0].x} ${pT+cH} Z`;
                    return (
                      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
                        <defs>
                          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F5A623" stopOpacity=".3" />
                            <stop offset="100%" stopColor="#F5A623" stopOpacity=".02" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        {[0,.25,.5,.75,1].map(p => (
                          <line key={p} x1={pL} y1={pT+p*cH} x2={W-pR} y2={pT+p*cH} stroke="rgba(255,255,255,0.05)" />
                        ))}
                        <path d={ap} fill="url(#tg)" />
                        <motion.path d={lp} fill="none" stroke="#F5A623" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                          initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:1.5, ease:"easeOut", delay:.3 }} />
                        {pts.map((p,i) => (
                          <g key={i}>
                            <motion.circle cx={p.x} cy={p.y} r={5} fill="#F5A623"
                              initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:.5+i*.1 }} />
                            <motion.circle cx={p.x} cy={p.y} r={5} fill="none" stroke="rgba(245,166,35,0.3)" strokeWidth={10}
                              initial={{ scale:0,opacity:0 }} animate={{ scale:1,opacity:1 }} transition={{ delay:.5+i*.1 }} />
                            <text x={p.x} y={p.y-12} textAnchor="middle" fontSize="10" fontFamily="monospace"
                              fill="rgba(255,255,255,0.6)" fontWeight="bold">
                              €{(trend[i].v/1000).toFixed(0)}k
                            </text>
                            <text x={p.x} y={H-4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.25)" fontFamily="monospace">
                              {String(trend[i].y).slice(2)}
                            </text>
                          </g>
                        ))}
                      </svg>
                    );
                  })()}
                </div>

                {/* Forecast metrics */}
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <ThermometerSnowflake className="w-3 h-3" /> Season Forecast
                  </p>
                  <div className="space-y-4">
                    <BigMetric label="Next Season Est." value={`€${portfolio.expectedAnnualPayout.toLocaleString()}`} color="text-accent-amber" />
                    <BigMetric label="5-Year Average" value={`€${avg5.toLocaleString()}`} color="text-white" />
                    <BigMetric label="Worst Case Scenario" value={`€${portfolio.maxPossiblePayout.toLocaleString()}`} color="text-danger-red" />
                    <div className="h-px bg-white/8" />
                    <div className="space-y-2">
                      <p className="text-white/30 text-[9px] uppercase tracking-wider">Risk Indicators</p>
                      <Indicator label="Climate trend" value="Worsening" color="text-danger-red" />
                      <Indicator label="Portfolio concentration" value="Moderate" color="text-accent-amber" />
                      <Indicator label="Reinsurance capacity" value="Adequate" color="text-success-green" />
                      <Indicator label="Premium adequacy" value={lr < 1 ? "Sufficient" : "Insufficient"} color={lr < 1 ? "text-success-green" : "text-danger-red"} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Sep() { return <div className="w-px h-4 bg-white/10 flex-shrink-0" />; }

function Stat({ icon, v, l, p="", c="text-white" }: { icon: React.ReactNode; v: number; l: string; p?: string; c?: string }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <div className="text-white/30">{icon}</div>
      <span className={`font-mono text-sm font-bold tabular-nums ${c}`}>{p}{v.toLocaleString()}</span>
      <span className="text-white/30 text-xs">{l}</span>
    </div>
  );
}

function Tab({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer outline-none ${
        active ? "bg-white/12 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/6"
      }`}>
      {icon} {label}
      {count !== undefined && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${active ? "bg-accent-amber text-bg-primary" : "bg-white/10 text-white/40"}`}>{count}</span>}
    </button>
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
    <div className="p-3 bg-white/4 border border-white/6 rounded-xl">
      <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-mono text-xl font-bold ${color}`}>{value}</p>
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
