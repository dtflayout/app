/**
 * RevealOnScroll
 * Tiny wrapper that fades-and-slides its children in once they intersect
 * the viewport. Pure CSS transitions — IntersectionObserver flips a
 * `data-revealed` attribute and CSS handles the rest. No external deps.
 *
 * Honors `prefers-reduced-motion: reduce` (renders content immediately
 * with no transition).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealOnScrollProps {
  children: ReactNode;
  delay?: number;          // ms — staggers nicely when reused on a row of cards
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const RevealOnScroll = ({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: RevealOnScrollProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // We can't easily forward a ref to an arbitrary `Tag`, so just type-cast.
  const Element = Tag as any;

  return (
    <Element
      ref={ref as any}
      data-revealed={revealed ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        "data-[revealed=false]:opacity-0 data-[revealed=false]:translate-y-4",
        "data-[revealed=true]:opacity-100 data-[revealed=true]:translate-y-0",
        className
      )}
    >
      {children}
    </Element>
  );
};
