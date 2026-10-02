import { cn } from "@/lib/utils";

/**
 * Sigla IMMY & EMY.
 *
 * Globul cu meridiane din identitatea existentă, redesenat ca SVG inline: se
 * randează instantaneu, moștenește culoarea temei și rămâne clar la orice
 * mărime, spre deosebire de o imagine rasterizată.
 */
export function Sigla({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-8 w-8 shrink-0", className)}
      role="img"
      aria-label="IMMY & EMY"
    >
      <circle cx="20" cy="20" r="19" fill="var(--primary-deep)" />
      <path
        d="M6 14c4 3 8-2 12 1s10-1 15 3"
        stroke="var(--tint)"
        strokeWidth="2"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M4 24c5 2 9-3 13 0s9 2 16-1"
        stroke="var(--tint)"
        strokeWidth="2"
        fill="none"
        opacity="0.85"
      />
      <circle
        cx="20"
        cy="20"
        r="19"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Sigla />
      <span className="font-serif text-lg font-semibold tracking-tight">
        IMMY &amp; EMY
      </span>
    </span>
  );
}
