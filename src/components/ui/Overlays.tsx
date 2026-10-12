"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStudio } from "@/lib/store";
import {
  BASE_PRICE,
  INITIALS_PRICE,
  MATERIALS,
  PART_IDS,
  PARTS,
  SIZES,
  colorName,
  encodeDesign,
  priceOf,
} from "@/lib/config";
import { thumbnail } from "@/lib/capture";
import * as I from "./Icons";

export type Sheet = "review" | "bag" | "saved" | "share" | null;

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-30 bg-[#0d0f14]/45 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    />
  );
}

function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <motion.div
      role="dialog"
      aria-modal
      aria-label={title}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col bg-paper shadow-[-20px_0_60px_rgba(13,15,20,0.18)]"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 340, damping: 38 }}
    >
      <header className="flex items-center justify-between px-6 pb-3 pt-5">
        <h2 className="font-display text-[24px] font-extrabold tracking-[-0.03em]">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full hover:bg-paper-2">
          <I.Close />
        </button>
      </header>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      {footer && <footer className="border-t border-line px-6 py-4">{footer}</footer>}
    </motion.div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        role="dialog"
        aria-modal
        aria-label={title}
        className={`pointer-events-auto relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[28px] bg-paper shadow-[0_30px_80px_rgba(13,15,20,0.3)] sm:rounded-[28px] ${wide ? "sm:max-w-[920px]" : "sm:max-w-[480px]"}`}
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-paper/80 backdrop-blur hover:bg-paper-2">
          <I.Close />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

// ---------- Review ----------

function Review({ onClose, onOpen }: { onClose: () => void; onOpen: (s: Sheet) => void }) {
  const design = useStudio((s) => s.design);
  const mood = useStudio((s) => s.mood);
  const [size, setSize] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const thumb = useMemo(() => thumbnail(mood, 720, 520), [mood]);
  const price = priceOf(design);

  const add = () => {
    if (!size) {
      setShake((n) => n + 1);
      return;
    }
    const s = useStudio.getState();
    s.addToBag({ design: JSON.parse(JSON.stringify(design)), size, price, thumb: thumbnail(mood) });
    s.notify(`Added "${design.name}", size EU ${size}, to your bag`);
    onOpen("bag");
  };

  return (
    <Modal title="Review your design" onClose={onClose} wide>
      <div className="no-scrollbar grid min-h-0 overflow-y-auto sm:grid-cols-[1.1fr_1fr]">
        <div className="relative bg-paper-2">
          {thumb && <img src={thumb} alt={`Preview of ${design.name}`} className="h-56 w-full object-cover sm:h-full" />}
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          <p className="text-[13px] text-muted">Forma Runner 01</p>
          <h2 className="pr-10 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em]">{design.name}</h2>

          <dl className="mt-5 divide-y divide-line border-y border-line text-[13.5px]">
            <div className="flex justify-between py-2">
              <dt className="text-muted">Base shoe</dt>
              <dd>${BASE_PRICE}</dd>
            </div>
            {PART_IDS.map((id) => {
              const p = design.parts[id];
              return (
                <div key={id} className="flex items-center gap-3 py-2">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]" style={{ background: p.color }} />
                  <dt className="w-24 shrink-0 font-medium">{PARTS[id].label}</dt>
                  <dd className="min-w-0 flex-1 truncate text-muted">
                    {colorName(p.color)}, {MATERIALS[p.mat].label.toLowerCase()}
                  </dd>
                  <dd className="text-muted">{MATERIALS[p.mat].price ? `+$${MATERIALS[p.mat].price}` : "Included"}</dd>
                </div>
              );
            })}
            {design.initials && (
              <div className="flex justify-between py-2">
                <dt className="font-medium">Initials &ldquo;{design.initials}&rdquo;</dt>
                <dd className="text-muted">+${INITIALS_PRICE}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-[15px] font-semibold">Size (EU)</h3>
              {!size && <span className="text-[13px] text-muted">Pick a size to continue</span>}
            </div>
            <motion.div
              key={shake}
              animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-6 gap-1.5"
              role="radiogroup"
              aria-label="Size"
            >
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={size === s}
                  onClick={() => setSize(s)}
                  className={`h-10 rounded-lg border text-[14px] font-medium transition ${size === s ? "border-ink bg-ink text-paper" : "border-line hover:border-muted"}`}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <p className="font-display text-[28px] font-extrabold tracking-[-0.03em]">${price}</p>
            <button
              type="button"
              onClick={add}
              className="ml-auto flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              <I.Bag width={18} height={18} />
              Add to bag
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Bag ----------

function BagDrawer({ onClose }: { onClose: () => void }) {
  const bag = useStudio((s) => s.bag);
  const remove = useStudio((s) => s.removeFromBag);
  const clear = useStudio((s) => s.clearBag);
  const [placed, setPlaced] = useState(false);
  const total = bag.reduce((n, b) => n + b.price, 0);

  if (placed) {
    return (
      <Drawer title="Order placed" onClose={onClose}>
        <div className="flex flex-col items-center py-14 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="grid h-20 w-20 place-items-center rounded-full bg-accent text-white"
          >
            <I.Check width={40} height={40} />
          </motion.div>
          <h3 className="mt-6 font-display text-[24px] font-extrabold tracking-[-0.03em]">Your pairs are in production</h3>
          <p className="mt-2 max-w-[30ch] text-[14px] text-muted">
            This is a demo store, so no payment was taken and nothing will ship.
          </p>
          <button type="button" onClick={onClose} className="mt-8 h-12 rounded-full bg-ink px-7 text-[15px] font-semibold text-paper">
            Design another pair
          </button>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      title="Bag"
      onClose={onClose}
      footer={
        bag.length > 0 && (
          <div>
            <div className="mb-1 flex justify-between text-[14px] text-muted">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">Total</span>
              <span className="font-display text-[26px] font-extrabold tracking-[-0.03em]">${total}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                clear();
                setPlaced(true);
              }}
              className="h-12 w-full rounded-full bg-accent text-[15px] font-semibold text-white transition hover:brightness-110"
            >
              Check out (demo)
            </button>
          </div>
        )
      }
    >
      {bag.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[15px] font-semibold">Your bag is empty</p>
          <p className="mt-1 text-[14px] text-muted">Review a design and pick a size to add it here.</p>
          <button type="button" onClick={onClose} className="mt-6 h-11 rounded-full border border-ink px-6 text-[14px] font-semibold">
            Keep designing
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          <AnimatePresence initial={false}>
            {bag.map((b) => (
              <motion.li
                key={b.id}
                layout
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30, height: 0 }}
                className="flex gap-4 py-4"
              >
                {b.thumb ? (
                  <img src={b.thumb} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="h-20 w-28 shrink-0 rounded-xl bg-paper-2" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.design.name}</p>
                  <p className="text-[13.5px] text-muted">Runner 01, EU {b.size}</p>
                  <div className="mt-1.5 flex gap-1">
                    {PART_IDS.slice(0, 6).map((id) => (
                      <span key={id} className="h-3 w-3 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]" style={{ background: b.design.parts[id].color }} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <span className="font-semibold">${b.price}</span>
                  <button type="button" onClick={() => remove(b.id)} aria-label={`Remove ${b.design.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-[var(--danger)]">
                    <I.Trash width={17} height={17} />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Drawer>
  );
}

// ---------- Saved ----------

function SavedDrawer({ onClose }: { onClose: () => void }) {
  const saved = useStudio((s) => s.saved);
  const del = useStudio((s) => s.deleteSaved);
  return (
    <Drawer title="My designs" onClose={onClose}>
      {saved.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[15px] font-semibold">No saved designs yet</p>
          <p className="mx-auto mt-1 max-w-[30ch] text-[14px] text-muted">
            Press the heart at the top to keep a design here. Designs stay in this browser.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          <AnimatePresence initial={false}>
            {saved.map((s) => (
              <motion.li key={s.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    const st = useStudio.getState();
                    st.loadDesign(s.design);
                    st.flyTo("home");
                    st.notify(`Opened "${s.design.name}"`);
                    onClose();
                  }}
                  className="block w-full overflow-hidden rounded-2xl border border-line text-left transition hover:border-ink"
                >
                  {s.thumb ? <img src={s.thumb} alt="" className="aspect-[3/2] w-full object-cover" /> : <div className="aspect-[3/2] bg-paper-2" />}
                  <span className="block px-3 py-2">
                    <span className="block truncate text-[14px] font-semibold">{s.design.name}</span>
                    <span className="block text-[12.5px] text-muted">
                      ${priceOf(s.design)}, saved {new Date(s.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => del(s.id)}
                  aria-label={`Delete ${s.design.name}`}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-paper/85 text-muted opacity-100 backdrop-blur transition hover:text-[var(--danger)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                >
                  <I.Trash width={16} height={16} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Drawer>
  );
}

// ---------- Share ----------

function ShareModal({ onClose }: { onClose: () => void }) {
  const design = useStudio((s) => s.design);
  const url = useMemo(() => `${window.location.origin}${window.location.pathname}?d=${encodeDesign(design)}`, [design]);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      useStudio.getState().notify("Copy didn't work here. Select the link and copy it by hand.");
    }
  };

  return (
    <Modal title="Share your design" onClose={onClose}>
      <div className="p-6 sm:p-8">
        <h2 className="pr-10 font-display text-[26px] font-extrabold tracking-[-0.03em]">Share {design.name}</h2>
        <p className="mt-1 text-[14px] text-muted">Anyone with this link opens the studio with your exact design.</p>
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-line bg-white/60 p-1.5 pl-4">
          <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Share link" className="min-w-0 flex-1 bg-transparent text-[13.5px] text-muted outline-none" />
          <button type="button" onClick={copy} className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold transition ${copied ? "bg-ink text-paper" : "bg-accent text-white hover:brightness-110"}`}>
            {copied ? <I.Check width={16} height={16} /> : <I.Copy width={16} height={16} />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ title: `${design.name} on Forma`, url }).catch(() => {})}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ink text-[14px] font-semibold"
          >
            <I.Share width={17} height={17} />
            Share with an app
          </button>
        )}
      </div>
    </Modal>
  );
}

// ---------- Toast ----------

function Toast() {
  const toast = useStudio((s) => s.toast);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-paper shadow-[0_12px_40px_rgba(13,15,20,0.25)]"
          >
            <I.Check width={16} height={16} className="text-tag" />
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Overlays({ sheet, onClose, onOpen }: { sheet: Sheet; onClose: () => void; onOpen: (s: Sheet) => void }) {
  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
  }, [sheet]);
  return (
    <>
      <AnimatePresence>{sheet && <Backdrop key="backdrop" onClose={onClose} />}</AnimatePresence>
      <AnimatePresence mode="wait">
        {sheet === "review" && <Review key="review" onClose={onClose} onOpen={onOpen} />}
        {sheet === "bag" && <BagDrawer key="bag" onClose={onClose} />}
        {sheet === "saved" && <SavedDrawer key="saved" onClose={onClose} />}
        {sheet === "share" && <ShareModal key="share" onClose={onClose} />}
      </AnimatePresence>
      <Toast />
    </>
  );
}
