"use client";

import { AnimatePresence, motion } from "motion/react";
import { Mark } from "./Logo";

export function Splash({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-50 grid place-items-center bg-paper text-ink"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }}
          role="status"
          aria-label="Loading the studio"
        >
          <div className="flex flex-col items-center gap-5">
            <motion.div
              initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="text-accent"
            >
              <Mark size={64} />
            </motion.div>
            <div className="h-[3px] w-40 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full w-1/3 rounded-full bg-ink"
                animate={{ x: ["-100%", "320%"] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="text-sm text-muted">Stitching your sneaker</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
