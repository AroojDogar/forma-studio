"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion } from "motion/react";
import { useStudio } from "@/lib/store";
import {
  MATERIALS,
  PART_IDS,
  PARTS,
  PRESETS,
  SWATCHES,
  colorName,
  priceOf,
  INITIALS_PRICE,
  type PartId,
} from "@/lib/config";
import * as I from "./Icons";

function Price({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    const controls = animate(from, value, {
      duration: 0.5,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `$${Math.round(v)}`;
      },
    });
    return () => controls.stop();
  }, [value]);
  return <span ref={ref}>${value}</span>;
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5 lg:px-7">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {aside && <span className="text-[13px] text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function PartButton({ id }: { id: PartId }) {
  const selected = useStudio((s) => s.selected === id);
  const color = useStudio((s) => s.design.parts[id].color);
  const select = useStudio((s) => s.select);
  const hover = useStudio((s) => s.hover);
  return (
    <button
      type="button"
      onClick={() => select(id)}
      onMouseEnter={() => hover(id)}
      onMouseLeave={() => hover(null)}
      aria-pressed={selected}
      className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium transition ${
        selected ? "text-paper" : "hover:bg-paper-2"
      }`}
    >
      {selected && (
        <motion.span
          layoutId="part-pill"
          className="absolute inset-0 rounded-xl bg-ink"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      <span
        className="relative h-4 w-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]"
        style={{ background: color }}
      />
      <span className="relative truncate">{PARTS[id].label}</span>
    </button>
  );
}

function ColorGrid({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const isCustom = !SWATCHES.some((s) => s.hex.toLowerCase() === value.toLowerCase());
  return (
    <div className="grid grid-cols-7 gap-2 sm:grid-cols-11 lg:grid-cols-7">
      {SWATCHES.map((s) => {
        const active = s.hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={s.hex}
            type="button"
            title={s.name}
            aria-label={s.name}
            aria-pressed={active}
            onClick={() => onChange(s.hex)}
            className="group relative aspect-square w-full rounded-full"
          >
            <span
              className={`absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-110 ${active ? "scale-[0.78]" : ""}`}
              style={{ background: s.hex }}
            />
            {active && (
              <motion.span
                layoutId="swatch-ring"
                className="absolute -inset-0.5 rounded-full border-2 border-ink"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
          </button>
        );
      })}
      <label
        title="Pick any color"
        className={`relative grid aspect-square w-full cursor-pointer place-items-center rounded-full ${isCustom ? "" : "bg-[conic-gradient(from_0deg,#ff5b5b,#ffd25b,#7bff5b,#5bd6ff,#7b5bff,#ff5bd6,#ff5b5b)]"}`}
        style={isCustom ? { background: value } : undefined}
      >
        <span className="sr-only">Pick any color</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        {isCustom ? (
          <span className="absolute -inset-0.5 rounded-full border-2 border-ink" />
        ) : (
          <I.Eyedrop width={14} height={14} className="text-white drop-shadow" />
        )}
      </label>
    </div>
  );
}

function NameField({ name, onCommit }: { name: string; onCommit: (n: string) => void }) {
  const [draft, setDraft] = useState(name);
  return (
    <>
      <label className="sr-only" htmlFor="design-name">Design name</label>
      <input
        id="design-name"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft.trim() || "Untitled design")}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        maxLength={32}
        className="-ml-1 mt-0.5 w-full rounded-md bg-transparent px-1 font-display text-[30px] font-extrabold leading-tight tracking-[-0.03em] outline-none hover:bg-paper-2 focus:bg-paper-2"
      />
    </>
  );
}

export function Panel({ onReview }: { onReview: () => void }) {
  const design = useStudio((s) => s.design);
  const selected = useStudio((s) => s.selected);
  const setColor = useStudio((s) => s.setColor);
  const setMat = useStudio((s) => s.setMat);
  const loadDesign = useStudio((s) => s.loadDesign);
  const rename = useStudio((s) => s.rename);
  const setInitials = useStudio((s) => s.setInitials);
  const setInitialsColor = useStudio((s) => s.setInitialsColor);
  const part = design.parts[selected];
  const price = priceOf(design);

  const activePreset = PRESETS.find((p) =>
    PART_IDS.every((id) => p.parts[id].color === design.parts[id].color && p.parts[id].mat === design.parts[id].mat),
  )?.name;

  return (
    <aside
      aria-label="Customize your sneaker"
      className="relative flex min-h-0 flex-1 flex-col border-line bg-paper lg:w-[420px] lg:flex-none lg:border-l"
    >
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pb-4 pt-5 lg:px-7 lg:pt-7">
          <p className="text-[13px] text-muted">Forma Runner 01</p>
          <NameField key={design.name} name={design.name} onCommit={rename} />
        </div>

        <Section title="Start from a colorway" aside={activePreset ? `Using ${activePreset}` : "Custom"}>
          <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 lg:-mx-7 lg:px-7">
            {PRESETS.map((p) => {
              const active = p.name === activePreset;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    loadDesign(p, true);
                    useStudio.getState().flyTo("home");
                  }}
                  aria-pressed={active}
                  className={`group flex shrink-0 flex-col items-start gap-2 rounded-2xl border p-2 pr-3 transition ${active ? "border-ink" : "border-line hover:border-muted"}`}
                >
                  <span className="flex h-9 w-16 overflow-hidden rounded-[10px]">
                    {(["upper", "stripe", "midsole", "outsole"] as PartId[]).map((id) => (
                      <span key={id} className="h-full flex-1" style={{ background: p.parts[id].color }} />
                    ))}
                  </span>
                  <span className="px-0.5 text-[13px] font-medium">{p.name}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Choose a part" aside={`${PART_IDS.length} parts`}>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {PART_IDS.map((id) => (
              <PartButton key={id} id={id} />
            ))}
          </div>
        </Section>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <section className="border-t border-line px-5 pb-1 pt-5 lg:px-7">
              <h2 className="font-display text-[22px] font-bold tracking-[-0.02em]">{PARTS[selected].label}</h2>
              <p className="mt-0.5 text-[13.5px] text-muted">{PARTS[selected].hint}</p>
            </section>

            <Section title="Material">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${PARTS[selected].label} material`}>
                {PARTS[selected].mats.map((m) => {
                  const active = part.mat === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMat(selected, m)}
                      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition ${
                        active ? "border-ink bg-ink text-paper" : "border-line hover:border-muted"
                      }`}
                    >
                      {active && <I.Check width={15} height={15} />}
                      {MATERIALS[m].label}
                      {MATERIALS[m].price > 0 && (
                        <span className={active ? "text-paper/70" : "text-muted"}>+${MATERIALS[m].price}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Color" aside={colorName(part.color)}>
              <ColorGrid value={part.color} onChange={(hex) => setColor(selected, hex)} />
            </Section>
          </motion.div>
        </AnimatePresence>

        <Section title="Personalize" aside={`+$${INITIALS_PRICE}`}>
          <p className="mb-3 text-[13.5px] text-muted">Up to 4 letters on the outer heel.</p>
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="initials">Initials</label>
            <input
              id="initials"
              value={design.initials}
              onChange={(e) => setInitials(e.target.value)}
              onFocus={() => useStudio.getState().flyTo("heel")}
              placeholder="Your initials"
              maxLength={4}
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white/60 px-3.5 font-display text-[17px] font-bold tracking-[0.08em] uppercase outline-none placeholder:font-sans placeholder:text-[14px] placeholder:font-normal placeholder:tracking-normal placeholder:normal-case focus:border-ink"
            />
            <div className="flex gap-1.5" role="radiogroup" aria-label="Initials color">
              {["#121315", "#f3f2ee", "#c9a45c", "#2f45d9", "#e2462f"].map((hex) => (
                <button
                  key={hex}
                  type="button"
                  role="radio"
                  aria-checked={design.initialsColor === hex}
                  aria-label={colorName(hex)}
                  onClick={() => setInitialsColor(hex)}
                  className={`h-7 w-7 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)] transition ${
                    design.initialsColor === hex ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""
                  }`}
                  style={{ background: hex }}
                />
              ))}
            </div>
          </div>
        </Section>
        <div className="h-4" />
      </div>

      <footer className="flex items-center gap-4 border-t border-line bg-paper px-5 py-4 lg:px-7">
        <div className="leading-tight">
          <p className="text-[12.5px] text-muted">Total</p>
          <p className="font-display text-[26px] font-extrabold tracking-[-0.03em]">
            <Price value={price} />
          </p>
        </div>
        <button
          type="button"
          onClick={onReview}
          className="ml-auto flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98] sm:flex-none"
        >
          Review design
        </button>
      </footer>
    </aside>
  );
}
