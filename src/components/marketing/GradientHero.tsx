import { ReactNode } from "react";

interface GradientHeroProps {
  children: ReactNode;
  variant?: "hero" | "secondary" | "subtle";
  className?: string;
}

const GradientHero = ({
  children,
  variant = "hero",
  className = "",
}: GradientHeroProps) => {
  const variantClasses = {
    hero: "bg-gradient-hero",
    secondary: "bg-gradient-secondary",
    subtle: "bg-gradient-subtle",
  };

  return (
    <section
      className={`${variantClasses[variant]} ${className}`}
    >
      {children}
    </section>
  );
};

export default GradientHero;
