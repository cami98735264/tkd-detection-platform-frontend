import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type PasswordInputProps = React.ComponentProps<"input">

// The visibility of the text is controlled internally via the eye toggle, so
// any incoming `type` prop is intentionally ignored.

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, type: _type, ...props }, ref) => {
    const [show, setShow] = React.useState(false)

    return (
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          disabled={props.disabled}
          tabIndex={-1}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-faint transition-interactive hover:text-text focus-visible:outline-none focus-visible:text-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          {show ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
