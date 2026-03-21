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
        background: "#0a0f0d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle gradient orb */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.02) 50%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
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
          fontWeight: 700,
          color: "#ffffff",
          margin: "0 0 16px 0",
          letterSpacing: "-0.02em",
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
            color: "#10b981",
          }}
        >
          {dots}
        </span>
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: "clamp(15px, 2.5vw, 18px)",
          color: "#6b7280",
          margin: "0 0 56px 0",
          fontWeight: 400,
          letterSpacing: "0.01em",
          textAlign: "center",
          padding: "0 24px",
          maxWidth: "480px",
          lineHeight: 1.6,
          position: "relative",
          zIndex: 1,
        }}
      >
        We're building something new for DTF printers worldwide.
      </p>

      {/* Divider line */}
      <div
        style={{
          width: "40px",
          height: "2px",
          background: "linear-gradient(90deg, #10b981, #059669)",
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
          color: "#4b5563",
          textDecoration: "none",
          letterSpacing: "0.02em",
          transition: "color 0.2s ease",
          position: "relative",
          zIndex: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#10b981")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#4b5563")}
      >
        dtflayout@gmail.com
      </a>
    </div>
  );
};

export default ComingSoon;
