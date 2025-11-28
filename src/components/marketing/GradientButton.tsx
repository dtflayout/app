import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "hero" | "secondary" | "outline" | "white" | "outline-teal";
  size?: "sm" | "md" | "lg" | "xl";
}

const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  (
    { className, variant = "hero", size = "md", children, ...props },
    ref
  ) => {
    const baseClasses =
      "font-semibold rounded-xl transition-all duration-300 inline-flex items-center justify-center transform hover:-translate-y-1 active:translate-y-0";

    const sizeClasses = {
      sm: "px-6 py-2.5 text-sm",
      md: "px-8 py-3.5 text-base",
      lg: "px-10 py-4 text-lg",
      xl: "px-12 py-5 text-xl",
    };

    const variantClasses = {
      hero: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl hover:shadow-2xl",
      secondary:
        "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl hover:shadow-2xl",
      outline:
        "border-2 border-white/30 backdrop-blur-sm text-white hover:bg-white/10 hover:border-white/50 shadow-lg hover:shadow-xl",
      white:
        "bg-white text-emerald-600 shadow-xl hover:shadow-2xl hover:scale-105",
      "outline-teal":
        "border-2 border-teal-600 bg-transparent text-teal-700 hover:bg-teal-50 shadow-lg hover:shadow-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GradientButton.displayName = "GradientButton";

export default GradientButton;
