import { cn } from "@/lib/utils";

interface BrandStripeProps {
  className?: string;
}

/**
 * Thin green/yellow band — the club's institutional colours (inspired by the
 * flag of El Espinal). Purely decorative.
 */
export function BrandStripe({ className }: BrandStripeProps) {
  return (
    <div aria-hidden="true" className={cn("flex h-1.5 w-full overflow-hidden", className)}>
      <span className="flex-1 bg-primary" />
      <span className="flex-1 bg-highlight" />
    </div>
  );
}
