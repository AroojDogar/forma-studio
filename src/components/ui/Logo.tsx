// The Forma mark is the same tapered sweep that runs along the shoe's side stripe.
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M6 22.5c4.6-.4 9.8-3.2 14.4-8.1 1.6-1.7 3.2-3.6 5.6-5.4-.6 3-2 6.3-4.6 9.1-3.9 4.2-9.3 6.2-15.4 4.4Z"
        fill="var(--mark-ink, #f6f7f3)"
      />
      <circle cx="24.6" cy="22.6" r="1.9" fill="var(--mark-ink, #f6f7f3)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <Mark />
      <span className="font-display text-[22px] font-extrabold leading-none tracking-[-0.04em]">forma</span>
    </span>
  );
}
