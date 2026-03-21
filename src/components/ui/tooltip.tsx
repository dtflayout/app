import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Mobile-friendly tooltip that works with both hover (desktop) and tap/click (mobile)
interface MobileTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  contentClassName?: string
}

const MobileTooltip = ({ children, content, contentClassName }: MobileTooltipProps) => {
  const [open, setOpen] = React.useState(false)

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen((prev) => !prev)
  }

  // Close tooltip when clicking outside
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = () => setOpen(false)
    document.addEventListener("click", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("click", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [open])

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center cursor-pointer"
            onClick={handleClick}
            onTouchEnd={handleClick}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className={cn(
            "z-[100] bg-gray-900 text-white px-3 py-2 rounded-md shadow-lg border-0 max-w-[280px]",
            contentClassName
          )}
          side="top"
          sideOffset={5}
          collisionPadding={10}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, MobileTooltip }
