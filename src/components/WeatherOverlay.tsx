"use client";

import { useEffect, useState } from "react";
import { Source, Layer } from "react-map-gl";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudRain, Thermometer, Layers } from "lucide-react";

type OverlayMode = "none" | "clouds" | "radar" | "temperature";

interface RainViewerFrame {
  time: number;
  path: string;
}

interface WeatherOverlayProps {
  showControls?: boolean;
  defaultMode?: OverlayMode;
}

/**
 * Live weather tile overlays using free, keyless APIs:
 * - Clouds + Temperature: OpenWeatherMap tile layer
 * - Radar: RainViewer animated precipitation radar
 *
 * RainViewer returns { radar: { past: [...], nowcast: [...] } }
 * Each frame has a `time` (unix seconds) we use to build tile URLs.
 */
export default function WeatherOverlay({
  showControls = true,
  defaultMode = "clouds",
}: WeatherOverlayProps) {
  const [mode, setMode] = useState<OverlayMode>(defaultMode);
  const [radarHost, setRadarHost] = useState("https://tilecache.rainviewer.com");
  const [radarFrames, setRadarFrames] = useState<RainViewerFrame[]>([]);
  const [pastCount, setPastCount] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [open, setOpen] = useState(false);

  // Fetch RainViewer radar metadata
  useEffect(() => {
    async function fetchRadar() {
      try {
        const res = await fetch(
          "https://api.rainviewer.com/public/weather-maps.json",
        );
        const data = await res.json();

        // Use host from API response if provided, else default
        if (data.host) setRadarHost(data.host);

        const past: RainViewerFrame[] = data.radar?.past ?? [];
        const nowcast: RainViewerFrame[] = data.radar?.nowcast ?? [];
        const all = [...past, ...nowcast];

        if (all.length > 0) {
          setRadarFrames(all);
          setPastCount(past.length);
          setFrameIndex(Math.max(0, past.length - 1));
        }
      } catch {
        // Silently degrade — radar just won't be available
      }
    }
    fetchRadar();
  }, []);

  // Animate through radar frames
  useEffect(() => {
    if (mode !== "radar" || radarFrames.length === 0) return;

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % radarFrames.length);
    }, 800);

    return () => clearInterval(interval);
  }, [mode, radarFrames]);

  // Build radar tile URL from the current frame's path
  const radarTileUrl =
    radarFrames.length > 0
      ? `${radarHost}${radarFrames[frameIndex].path}/256/{z}/{x}/{y}/2/1_1.png`
      : null;

  const modeIcon: Record<OverlayMode, React.ReactNode> = {
    none: <Layers className="w-4 h-4" />,
    clouds: <Cloud className="w-4 h-4" />,
    radar: <CloudRain className="w-4 h-4" />,
    temperature: <Thermometer className="w-4 h-4" />,
  };

  const modeLabel: Record<OverlayMode, string> = {
    none: "Off",
    clouds: "Clouds",
    radar: "Radar",
    temperature: "Temp",
  };

  return (
    <>
      {/* Cloud cover — OpenWeatherMap free demo tile */}
      {mode === "clouds" && (
        <Source
          id="clouds"
          type="raster"
          tiles={[
            "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=b1b15e88fa797225412429c1c50c122a1",
          ]}
          tileSize={256}
        >
          <Layer
            id="clouds-layer"
            type="raster"
            paint={{ "raster-opacity": 0.5 }}
          />
        </Source>
      )}

      {/*
       * Precipitation radar — RainViewer (free, no key).
       * Key the Source by frameIndex so Mapbox swaps tile URLs on each frame.
       */}
      {mode === "radar" && radarTileUrl && (
        <Source
          key={`radar-${frameIndex}`}
          id={`radar-${frameIndex}`}
          type="raster"
          tiles={[radarTileUrl]}
          tileSize={256}
        >
          <Layer
            id={`radar-layer-${frameIndex}`}
            type="raster"
            paint={{ "raster-opacity": 0.6 }}
          />
        </Source>
      )}

      {/* Temperature heatmap — OpenWeatherMap */}
      {mode === "temperature" && (
        <Source
          id="temperature"
          type="raster"
          tiles={[
            "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=b1b15e88fa797225412429c1c50c122a1",
          ]}
          tileSize={256}
        >
          <Layer
            id="temperature-layer"
            type="raster"
            paint={{ "raster-opacity": 0.5 }}
          />
        </Source>
      )}

      {/* Controls */}
      {showControls && (
        <div className="absolute top-14 left-4 z-30">
          <div className="flex items-center gap-1">
            <motion.button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 bg-bg-secondary/90 backdrop-blur border border-border-subtle rounded-lg
                         text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              whileTap={{ scale: 0.95 }}
            >
              {modeIcon[mode]}
              <span className="text-xs font-medium">{modeLabel[mode]}</span>
            </motion.button>

            <AnimatePresence>
              {open && (
                <motion.div
                  className="flex gap-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  {(["none", "clouds", "radar", "temperature"] as OverlayMode[]).map(
                    (m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setMode(m);
                          setOpen(false);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer
                        ${
                          mode === m
                            ? "bg-accent-amber/20 text-accent-amber border border-accent-amber/30"
                            : "bg-bg-secondary/90 backdrop-blur border border-border-subtle text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {modeIcon[m]}
                        {modeLabel[m]}
                      </button>
                    ),
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Radar timestamp indicator */}
          {mode === "radar" && radarFrames.length > 0 && (
            <motion.div
              className="mt-2 px-3 py-1.5 bg-bg-secondary/90 backdrop-blur border border-border-subtle rounded-lg inline-block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-text-tertiary text-[10px] uppercase tracking-wider">
                Precipitation radar
              </p>
              <p className="text-text-secondary text-xs font-mono">
                {new Date(
                  radarFrames[frameIndex].time * 1000,
                ).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {frameIndex >= pastCount && (
                  <span className="text-accent-amber ml-1.5 text-[10px] uppercase tracking-wider">
                    nowcast
                  </span>
                )}
              </p>
            </motion.div>
          )}
        </div>
      )}
    </>
  );
}
