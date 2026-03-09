import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean, variant?: "default" | "outline" | "ghost" | "secondary" }>(({ className, variant = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "h-9 px-4 py-2",
        {
          "bg-blue-600 text-white shadow hover:bg-blue-600/90": variant === "default",
          "border border-slate-700 bg-transparent shadow-sm hover:bg-slate-800 hover:text-white": variant === "outline",
          "hover:bg-slate-800 hover:text-white": variant === "ghost",
          "bg-slate-800 text-slate-100 hover:bg-slate-800/80": variant === "secondary",
        },
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
