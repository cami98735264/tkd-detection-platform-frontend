import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "border-transparent bg-surface-2 text-text hover:bg-surface-offset",
        destructive:
          "border-transparent bg-error/12 text-error hover:bg-error/20",
        outline:
          "border-border text-text",
        "outline-muted":
          "border-border text-muted",
        success:
          "border-transparent bg-success/12 text-success hover:bg-success/20",
        warning:
          "border-transparent bg-warning/15 text-text hover:bg-warning/25",
        tonal:
          "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
