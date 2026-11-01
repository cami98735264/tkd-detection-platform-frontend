import {
  Award,
  Flame,
  Footprints,
  Medal,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  flame: Flame,
  fire: Flame,
  star: Star,
  trophy: Trophy,
  medal: Medal,
  target: Target,
  zap: Zap,
  kick: Zap,
  footprints: Footprints,
  poomsae: Footprints,
  award: Award,
};

export function BadgeIcon({ icon, className }: { icon?: string; className?: string }) {
  const Icon = (icon && ICONS[icon.toLowerCase()]) || Award;
  return <Icon className={className} aria-hidden="true" />;
}
