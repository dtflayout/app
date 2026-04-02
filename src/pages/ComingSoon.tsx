import { useEffect, useState } from "react";

const ComingSoon = () => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0F0D2E 0%, #1E1B4B 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle gradient orbs */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.03) 50%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 60%)",
          top: "20%",
          right: "10%",
          pointerEvents: "none",
          filter: "blur(30px)",
        }}
      />

      {/* Dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Logo */}
      <img
        src="/DTF-Layout-WHITE-logo-text.png"
        alt="DTF Layout"
        style={{
          height: "52px",
          marginBottom: "48px",
          position: "relative",
          zIndex: 1,
        }}
      />

      {/* Main text */}
      <h1
        style={{
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 800,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          color: "#ffffff",
          margin: "0 0 16px 0",
          letterSpacing: "-0.03em",
          position: "relative",
          zIndex: 1,
        }}
      >
        Coming Soon
        <span
          style={{
            display: "inline-block",
            width: "36px",
            textAlign: "left",
            color: "#818CF8",
          }}
        >
          {dots}
        </span>
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: "clamp(15px, 2.5vw, 18px)",
          color: "#A5B4FC",
          margin: "0 0 56px 0",
          fontWeight: 400,
          letterSpacing: "0.01em",
          textAlign: "center",
          padding: "0 24px",
          maxWidth: "480px",
          lineHeight: 1.6,
          position: "relative",
          zIndex: 1,
          opacity: 0.7,
        }}
      >
        We're building something new for DTF printers worldwide.
      </p>

      {/* Divider line */}
      <div
        style={{
          width: "40px",
          height: "2px",
          background: "linear-gradient(90deg, #4F46E5, #7C3AED)",
          borderRadius: "1px",
          marginBottom: "32px",
          position: "relative",
          zIndex: 1,
        }}
      />

      {/* Contact */}
      <a
        href="mailto:dtflayout@gmail.com"
        style={{
          fontSize: "14px",
          color: "rgba(165,180,252,0.5)",
          textDecoration: "none",
          letterSpacing: "0.02em",
          transition: "color 0.2s ease",
          position: "relative",
          zIndex: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#A5B4FC")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(165,180,252,0.5)")}
      >
        dtflayout@gmail.com
      </a>
    </div>
  );
};

export default ComingSoon;
