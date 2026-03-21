import { cn } from "@/lib/utils";
import { CSSProperties, ReactNode } from "react";

interface NeonGradientCardProps {
  children: ReactNode;
  className?: string;
  borderSize?: number;
  borderRadius?: number;
  neonColors?: {
    firstColor: string;
    secondColor: string;
  };
}

export function NeonGradientCard({
  children,
  className,
  borderSize = 2,
  borderRadius = 20,
  neonColors = {
    firstColor: "#4F46E5",
    secondColor: "#3b82f6",
  },
}: NeonGradientCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--border-radius)] p-[var(--border-size)]",
        className
      )}
      style={
        {
          "--border-size": `${borderSize}px`,
          "--border-radius": `${borderRadius}px`,
          "--neon-first-color": neonColors.firstColor,
          "--neon-second-color": neonColors.secondColor,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          "bg-[radial-gradient(600px_circle_at_var(--x)_var(--y),var(--neon-first-color)_0%,transparent_40%)]"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          "bg-[radial-gradient(800px_circle_at_var(--x)_var(--y),var(--neon-second-color)_0%,transparent_40%)]"
        )}
      />
      <div className="relative z-[2] h-full w-full rounded-[calc(var(--border-radius)-var(--border-size))] bg-white">
        {children}
      </div>
    </div>
  );
}
