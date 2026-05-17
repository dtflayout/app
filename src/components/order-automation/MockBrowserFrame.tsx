/**
 * MockBrowserFrame
 * macOS-style window chrome — three traffic-light dots, an address bar,
 * and a content area. Used to wrap the "looks-real" Order Automation
 * mock screenshot. Fully decorative — nothing inside is interactive.
 */
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface MockBrowserFrameProps {
  url: string;
  children: ReactNode;
  className?: string;
}

export const MockBrowserFrame = ({
  url,
  children,
  className,
}: MockBrowserFrameProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gray-200 bg-white",
        // Layered shadow that lifts the frame off the page
        "shadow-[0_10px_28px_rgba(15,23,42,0.08),0_28px_80px_-20px_rgba(79,70,229,0.25),0_2px_6px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100/80 px-4 py-3">
        {/* Traffic-light dots */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#FF5F57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.08)]" />
          <span className="h-3 w-3 rounded-full bg-[#FEBC2E] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.08)]" />
          <span className="h-3 w-3 rounded-full bg-[#28C840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.08)]" />
        </div>

        {/* Address bar */}
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex min-w-0 max-w-[420px] flex-1 items-center gap-2 rounded-md border border-gray-200/80 bg-white px-3 py-1.5">
            <Lock
              className="h-3 w-3 flex-shrink-0 text-emerald-600"
              strokeWidth={2.5}
            />
            <span className="truncate text-[11.5px] font-medium text-gray-500">
              {url}
            </span>
          </div>
        </div>

        {/* Right spacer — keeps the address bar visually centered */}
        <div className="hidden h-3 w-[54px] sm:block" aria-hidden />
      </div>

      {/* Content area */}
      <div className="bg-white">{children}</div>
    </div>
  );
};
