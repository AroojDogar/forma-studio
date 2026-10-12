"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useStudio } from "@/lib/store";
import { poster, thumbnail } from "@/lib/capture";
import { Logo } from "./Logo";
import * as I from "./Icons";
import type { Sheet } from "./Overlays";

function IconButton({
  label,
  onClick,
  disabled,
  children,
  badge,
  className = "grid",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  badge?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`relative ${className} h-9 w-9 place-items-center sm:h-10 sm:w-10 rounded-full text-[var(--stage-ink)] transition-[background-color,opacity] hover:bg-[var(--stage-chip)] disabled:opacity-30 disabled:hover:bg-transparent`}
    >
      {children}
      <AnimatePresence>
        {!!badge && (
          <motion.span
            key={badge}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white"
          >
            {badge}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function TopBar({ onOpen }: { onOpen: (s: Sheet) => void }) {
  const canUndo = useStudio((s) => s.past.length > 0);
  const canRedo = useStudio((s) => s.future.length > 0);
  const savedCount = useStudio((s) => s.saved.length);
  const bagCount = useStudio((s) => s.bag.length);
  const [busy, setBusy] = useState(false);

  const save = () => {
    const s = useStudio.getState();
    s.saveDesign(thumbnail(s.mood));
    s.notify(`Saved "${s.design.name}" to your designs`);
  };

  const download = async () => {
    if (busy) return;
    setBusy(true);
    const s = useStudio.getState();
    const blob = await poster(s.design, s.mood);
    setBusy(false);
    if (!blob) return s.notify("The image couldn't be created. Try again in a second.");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forma-${s.design.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "design"}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    s.notify("Image downloaded");
  };

  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 text-[var(--stage-ink)] lg:px-6 lg:py-4">
      <Link href="/" className="rounded-lg" aria-label="Forma Studio home" style={{ ["--mark-ink" as string]: "var(--stage-inverse)" }}>
        <Logo />
      </Link>
      <nav className="flex items-center gap-0.5 rounded-full border border-[var(--stage-chip-line)] bg-[var(--stage-chip)] p-1 backdrop-blur-md">
        <IconButton label="Undo (Ctrl+Z)" onClick={() => useStudio.getState().undo()} disabled={!canUndo} className="hidden sm:grid">
          <I.Undo />
        </IconButton>
        <IconButton label="Redo (Ctrl+Shift+Z)" onClick={() => useStudio.getState().redo()} disabled={!canRedo} className="hidden sm:grid">
          <I.Redo />
        </IconButton>
        <span className="mx-1 hidden h-5 w-px bg-[var(--stage-chip-line)] sm:block" aria-hidden />
        <IconButton label="Save design" onClick={save}>
          <I.Heart />
        </IconButton>
        <IconButton label="My designs" onClick={() => onOpen("saved")} badge={savedCount}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="4" y="4" width="7" height="7" rx="1.5" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" />
          </svg>
        </IconButton>
        <IconButton label="Share link" onClick={() => onOpen("share")}>
          <I.Share />
        </IconButton>
        <IconButton label="Download image" onClick={download} disabled={busy}>
          <I.Camera />
        </IconButton>
        <IconButton label="Bag" onClick={() => onOpen("bag")} badge={bagCount}>
          <I.Bag />
        </IconButton>
      </nav>
    </header>
  );
}
