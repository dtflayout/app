import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";

const chevIcon = (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const productDropdownItems = [
  { l: "Gang Sheet Builder", d: "Auto-layout optimized gang sheets", to: "/product/gang-sheet-builder" },
  { l: "Website Integration", d: "Embed builder on any website", to: "/product/website-integration" },
  { l: "Quick Store", d: "Full storefront, zero coding", to: "/product/quick-store" },
];

const navLinks = [
  { l: "Pricing", to: "/pricing" },
  { l: "FAQ", to: "/faq" },
  { l: "Contact", to: "/contact" },
];

export default function MarketingNav() {
  const [dd, setDd] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ position: "fixed", top: 16, left: 0, right: 0, zIndex: 100, padding: "0 32px" }}>
      <nav style={{
        maxWidth: 960, margin: "0 auto",
        background: "linear-gradient(135deg, #1E1B4B, #252272, #1E1B4B)",
        borderRadius: 16,
        padding: "0 8px 0 24px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        border: "1px solid rgba(99, 102, 241, 0.2)",
        boxShadow: "0 8px 32px rgba(15,13,46,0.5), 0 2px 8px rgba(0,0,0,0.2)",
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <span style={{ fontFamily: HF, fontWeight: 700, fontSize: 16, color: "#fff" }}>DTF Layout</span>
        </Link>

        {/* Center links */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link to="/" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", padding: "8px 14px", textDecoration: "none" }}>Home</Link>

          {/* Product dropdown */}
          <div style={{ position: "relative" }} onMouseEnter={() => setDd(true)} onMouseLeave={() => setDd(false)}>
            <span style={{
              fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, padding: "8px 14px",
              borderRadius: 10, background: dd ? "rgba(255,255,255,0.08)" : "transparent",
              transition: "background 0.2s",
            }}>
              Product {chevIcon}
            </span>
            {dd && (
              <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 260, paddingTop: 10 }}>
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", boxShadow: "0 20px 56px rgba(0,0,0,0.15)", padding: 5 }}>
                  {productDropdownItems.map((it, i) => (
                    <Link key={i} to={it.to} style={{ padding: "10px 12px", borderRadius: 10, display: "block", textDecoration: "none" }}
                      onMouseEnter={(e: any) => e.currentTarget.style.background = "#EEF2FF"}
                      onMouseLeave={(e: any) => e.currentTarget.style.background = "transparent"}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{it.l}</div>
                      <div style={{ fontSize: 10, color: "#6B7280" }}>{it.d}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {navLinks.map(item => (
            <Link key={item.l} to={item.to} style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", padding: "8px 14px", textDecoration: "none" }}>{item.l}</Link>
          ))}
        </div>

        {/* Auth buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {user ? (
            <button onClick={() => navigate("/app")} style={{
              fontFamily: BF, fontWeight: 600, fontSize: 14, cursor: "pointer",
              padding: "10px 24px", borderRadius: 12,
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              color: "#fff", border: "none",
              boxShadow: "0 4px 16px rgba(79,70,229,0.4)",
            }}>Go to App →</button>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", padding: "8px 14px", textDecoration: "none" }}>Login</Link>
              <button onClick={() => navigate("/signup")} style={{
                fontFamily: BF, fontWeight: 600, fontSize: 14, cursor: "pointer",
                padding: "10px 24px", borderRadius: 12,
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                color: "#fff", border: "none",
                boxShadow: "0 4px 16px rgba(79,70,229,0.4)",
              }}>Register →</button>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
