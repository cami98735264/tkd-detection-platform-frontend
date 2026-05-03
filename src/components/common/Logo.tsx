import { cn } from "@/lib/utils";

interface LogoProps {
  /** Tailwind size classes (e.g. "h-9 w-9"). Defaults to h-9 w-9. */
  className?: string;
  /** Override the alt text. Set to "" if used purely decoratively next to the wordmark. */
  alt?: string;
  /** Tone treatment:
   *  - "auto"   (default): black in light mode, inverted to white in dark mode
   *  - "always-light": always rendered as the light/negative version (e.g. on crimson chip)
   *  - "always-dark":  always rendered as the dark/positive version
   *  - "primary": tinted to the brand crimson via blend (overlays the source as multiply)
   */
  tone?: "auto" | "always-light" | "always-dark" | "primary";
  /** Eager loading. Default false. The auth shell logos and topbar mark should set this. */
  eager?: boolean;
}

const TONE_CLASSES: Record<NonNullable<LogoProps["tone"]>, string> = {
  auto: "dark:invert dark:brightness-90",
  "always-light": "invert brightness-95",
  "always-dark": "",
  primary:
    // Recolor the black silhouette to the brand crimson. drop-shadow is intentionally
    // omitted so it remains crisp on warm-stone surfaces.
    "[filter:brightness(0)_saturate(100%)_invert(33%)_sepia(63%)_saturate(1854%)_hue-rotate(348deg)_brightness(94%)_contrast(91%)]",
};

export function Logo({
  className,
  alt = "Warriors TKD",
  tone = "auto",
  eager = false,
}: LogoProps) {
  return (
    <img
      src="/img/logo.png"
      alt={alt}
      width={120}
      height={120}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={cn(
        "h-12 w-12 select-none object-contain",
        TONE_CLASSES[tone],
        className,
      )}
    />
  );
}
