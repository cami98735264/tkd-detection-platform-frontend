import { ReactNode, useEffect, useState } from "react";

import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";

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
        <section className="relative flex min-h-[60vh] flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="absolute right-6 top-6 sm:right-10 sm:top-10 lg:right-12 lg:top-12">
            <div className="rounded-md border border-border bg-bg/90 p-1 backdrop-blur-sm">
              <ThemeToggle />
            </div>
          </div>
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
  const rotatingHeadlines: ReactNode[] = [
    headline,
    (
      <>
        Entrenamientos,
        <br />
        personalizados.
      </>
    ),
    (
      <>
        Evaluaciones,
        <br />
        y progreso.
      </>
    ),
  ];

  const [index, setIndex] = useState(0);
  const [isHeadlineVisible, setIsHeadlineVisible] = useState(true);

  useEffect(() => {
    let transitionTimeout: ReturnType<typeof setTimeout> | undefined;

    const id = setInterval(() => {
      setIsHeadlineVisible(false);
      transitionTimeout = setTimeout(() => {
        setIndex((i) => (i + 1) % rotatingHeadlines.length);
        setIsHeadlineVisible(true);
      }, 450);
    }, 6000);

    return () => {
      clearInterval(id);
      if (transitionTimeout) {
        clearTimeout(transitionTimeout);
      }
    };
  }, [rotatingHeadlines.length]);

  const currentHeadline = rotatingHeadlines[index];

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

      <div className="relative flex items-center">
        <Logo className="h-48 w-48 drop-shadow-sm" alt="Warriors TKD" eager />
      </div>

      <div className="relative mt-auto pt-12 lg:pt-20">
        <div className="relative h-36 sm:h-48">
          <h1
            className={`font-display text-4xl font-semibold leading-[1.05] tracking-tight text-text transition-opacity duration-500 ease-in-out sm:text-5xl ${
              isHeadlineVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {currentHeadline}
          </h1>
        </div>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
          {subcopy}
        </p>

        <div className="mt-10 flex items-center gap-3">
          {rotatingHeadlines.map((_, i) => (
            <span
              key={i}
              className={
                i === index
                  ? "h-2 w-10 rounded-full bg-primary transition-all duration-500 ease-in-out"
                  : "h-2 w-2 rounded-full bg-primary/30 transition-all duration-500 ease-in-out"
              }
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
