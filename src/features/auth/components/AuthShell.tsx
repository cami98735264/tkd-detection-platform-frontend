import type { ReactNode } from "react";

import { Logo } from "@/components/common/Logo";

interface AuthShellProps {
  /** The form panel rendered on the right (md+) or below the brand band (mobile). */
  children: ReactNode;
  /** Override the headline shown in the brand panel. */
  brandHeadline?: ReactNode;
  /** Override the supporting copy below the headline. */
  brandSubcopy?: ReactNode;
}

const DEFAULT_HEADLINE = (
  <>
    Disciplina,
    <br />
    técnica,
    <br />
    constancia.
  </>
);

const DEFAULT_SUBCOPY =
  "Sistema administrativo de Warriors TKD — Espinal. Gestiona deportistas, entrenamientos, evaluaciones y comunicaciones desde un solo lugar.";

export function AuthShell({
  children,
  brandHeadline = DEFAULT_HEADLINE,
  brandSubcopy = DEFAULT_SUBCOPY,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="grid min-h-screen lg:grid-cols-[3fr_2fr]">
        <BrandPanel headline={brandHeadline} subcopy={brandSubcopy} />
        <section className="flex min-h-[60vh] flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </div>
  );
}

function BrandPanel({
  headline,
  subcopy,
}: {
  headline: ReactNode;
  subcopy: ReactNode;
}) {
  return (
    <aside className="relative isolate overflow-hidden bg-surface-offset px-6 py-10 sm:px-10 lg:px-14 lg:py-16 flex flex-col min-h-[44vh] lg:min-h-screen">
      {/* Photographic background */}
      <img
        src="/img/login-bg.jpg"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        width={1600}
        height={2400}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />
      {/* Legibility overlay — bottom-heavy so the headline reads clearly */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-bg via-bg/55 to-bg/0"
      />
      {/* Subtle warm wash so the photo blends with the warm-stone palette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-surface-offset/35 mix-blend-multiply dark:mix-blend-overlay"
      />
      {/* Crimson corner glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-24 -z-10 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative flex items-center gap-3">
        <Logo className="h-20 w-20 -my-2 drop-shadow-sm" alt="" eager />
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold tracking-tight text-text">
            Warriors TKD
          </p>
          <p className="text-xs text-muted">Espinal</p>
        </div>
      </div>

      <div className="relative mt-auto pt-12 lg:pt-20">
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-text sm:text-5xl">
          {headline}
        </h1>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
          {subcopy}
        </p>

        <div className="mt-10 flex items-center gap-3">
          <span className="h-2 w-10 rounded-full bg-primary" />
          <span className="h-2 w-2 rounded-full bg-primary/30" />
          <span className="h-2 w-2 rounded-full bg-primary/30" />
        </div>
      </div>
    </aside>
  );
}
