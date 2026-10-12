"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useStudio } from "@/lib/store";
import { decodeDesign, PARTS } from "@/lib/config";
import { Splash } from "./ui/Splash";
import { TopBar } from "./ui/TopBar";
import { Panel } from "./ui/Panel";
import { StageControls } from "./ui/StageControls";
import { Overlays, type Sheet } from "./ui/Overlays";

const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

const MOODS = ["studio", "sunset", "neon"] as const;

export default function Studio() {
  const ready = useStudio((s) => s.ready);
  const mood = useStudio((s) => s.mood);
  const hovered = useStudio((s) => s.hovered);
  const [sheet, setSheet] = useState<Sheet>(null);

  // Restore saved designs and bag, and open a shared design from the link.
  useEffect(() => {
    const s = useStudio.getState();
    s.hydrate();
    const code = new URLSearchParams(window.location.search).get("d");
    if (code) {
      const d = decodeDesign(code);
      if (d) {
        s.loadDesign(d);
        useStudio.setState({ past: [] });
        s.notify(`Opened shared design "${d.name}"`);
      } else {
        s.notify("That share link is broken, so we started a fresh design.");
      }
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const s = useStudio.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "e") s.toggleExplode();
      if (e.key === "r") s.toggleRotate();
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden bg-paper lg:flex-row">
      <section className="stage relative min-h-0 flex-[1.15] lg:flex-1" data-mood={mood}>
        {/* mood backdrops cross-fade */}
        {MOODS.map((m) => (
          <div
            key={m}
            aria-hidden
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: mood === m ? 1 : 0, background: BACKDROPS[m] }}
          />
        ))}

        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="backdrop-type select-none whitespace-nowrap font-display text-[clamp(120px,21vw,400px)] font-extrabold leading-none tracking-[-0.05em]">
            FORMA 01
          </span>
        </div>

        <div className="absolute inset-0">
          <Scene />
        </div>

        <TopBar onOpen={setSheet} />

        <AnimatePresence>
          {hovered && (
            <motion.div
              key={hovered}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rounded-full border border-[var(--stage-chip-line)] bg-[var(--stage-chip)] px-4 py-2 text-sm text-[var(--stage-ink)] backdrop-blur-md lg:left-6 lg:translate-x-0"
            >
              <span className="font-semibold">{PARTS[hovered].label}</span>
              <span className="text-[var(--stage-soft)]">, click to customize</span>
            </motion.div>
          )}
        </AnimatePresence>

        <StageControls />
      </section>

      <Panel onReview={() => setSheet("review")} />

      <Overlays sheet={sheet} onClose={() => setSheet(null)} onOpen={setSheet} />

      <Splash visible={!ready} />
    </div>
  );
}

const BACKDROPS = {
  studio: "radial-gradient(120% 90% at 50% 38%, #f2f3ef 0%, #dfe2dc 55%, #c9cec7 100%)",
  sunset: "radial-gradient(120% 90% at 50% 30%, #fde3c2 0%, #f3a585 50%, #c8605a 100%)",
  neon: "radial-gradient(120% 90% at 50% 35%, #2a1d5c 0%, #140d33 55%, #06040e 100%)",
} as const;
