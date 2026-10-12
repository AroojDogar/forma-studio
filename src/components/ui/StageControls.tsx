"use client";

import { motion } from "motion/react";
import { useStudio, type View } from "@/lib/store";
import type { Mood } from "@/lib/config";
import * as I from "./Icons";

const VIEWS: { id: View; label: string }[] = [
  { id: "home", label: "Side" },
  { id: "tongue", label: "Top" },
  { id: "toe", label: "Toe" },
  { id: "heel", label: "Heel" },
  { id: "outsole", label: "Sole" },
];

const MOODS: { id: Mood; label: string; swatch: string }[] = [
  { id: "studio", label: "Studio light", swatch: "linear-gradient(135deg,#ffffff,#c9cec7)" },
  { id: "sunset", label: "Sunset light", swatch: "linear-gradient(135deg,#fde3c2,#c8605a)" },
  { id: "neon", label: "Neon light", swatch: "linear-gradient(135deg,#5ff0ff,#ff3df2 60%,#2a1d5c)" },
];

const chip =
  "rounded-full border border-[var(--stage-chip-line)] bg-[var(--stage-chip)] backdrop-blur-md text-[var(--stage-ink)]";

export function StageControls() {
  const view = useStudio((s) => s.view.target);
  const flyTo = useStudio((s) => s.flyTo);
  const exploded = useStudio((s) => s.exploded);
  const autoRotate = useStudio((s) => s.autoRotate);
  const mood = useStudio((s) => s.mood);
  const setMood = useStudio((s) => s.setMood);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-3 pb-3 lg:pb-6">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2">
        <div className={`${chip} relative flex p-1`} role="group" aria-label="Camera view">
          {VIEWS.map((v) => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => flyTo(v.id)}
                aria-pressed={active}
                className="relative rounded-full px-3 py-1.5 text-[13px] font-medium sm:px-3.5"
              >
                {active && (
                  <motion.span
                    layoutId="view-pill"
                    className="absolute inset-0 rounded-full bg-[var(--stage-ink)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={`relative ${active ? "text-[var(--stage-inverse)]" : "text-[var(--stage-ink)]"}`}>
                  {v.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`${chip} flex items-center gap-1 p-1`}>
          <button
            type="button"
            onClick={() => useStudio.getState().toggleExplode()}
            aria-pressed={exploded}
            title="Exploded view (E)"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-[background-color] ${exploded ? "bg-accent text-white" : "text-[var(--stage-ink)]"}`}
          >
            <I.Explode width={16} height={16} />
            <span>Explode</span>
          </button>
          <button
            type="button"
            onClick={() => useStudio.getState().toggleRotate()}
            aria-pressed={autoRotate}
            aria-label="Auto rotate"
            title="Auto rotate (R)"
            className={`grid h-8 w-8 place-items-center rounded-full transition-[background-color] ${autoRotate ? "bg-accent text-white" : "text-[var(--stage-ink)]"}`}
          >
            <I.Rotate width={16} height={16} className={autoRotate ? "animate-spin [animation-duration:3s]" : ""} />
          </button>
        </div>

        <div className={`${chip} flex items-center gap-1.5 p-1.5`} role="radiogroup" aria-label="Lighting">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mood === m.id}
              aria-label={m.label}
              title={m.label}
              onClick={() => setMood(m.id)}
              className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-transparent transition ${mood === m.id ? "ring-2 ring-[var(--stage-ink)]" : "opacity-80 hover:opacity-100"}`}
              style={{ background: m.swatch }}
            />
          ))}
        </div>
      </div>
      <p className="hidden text-xs text-[var(--stage-soft)] sm:block">
        Drag to rotate, scroll to zoom, click any part to customize it
      </p>
    </div>
  );
}
