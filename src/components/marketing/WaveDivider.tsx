interface WaveDividerProps {
  variant?: "top" | "bottom";
  color?: "white" | "slate";
}

const WaveDivider = ({ variant = "bottom", color = "white" }: WaveDividerProps) => {
  const fillColor = color === "white" ? "#ffffff" : "#f8fafc";

  if (variant === "top") {
    return (
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
        <svg
          className="relative block w-full h-12 md:h-20"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 C150,60 350,0 600,40 C850,80 1050,20 1200,60 L1200,120 L0,120 Z"
            fill={fillColor}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180">
      <svg
        className="relative block w-full h-12 md:h-20"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 C150,60 350,0 600,40 C850,80 1050,20 1200,60 L1200,120 L0,120 Z"
          fill={fillColor}
        />
      </svg>
    </div>
  );
};

export default WaveDivider;
