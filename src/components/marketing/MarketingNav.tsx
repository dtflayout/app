import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";

const chevIcon = (
  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const productDropdownItems: { l: string; d: string; to: string; badge?: string }[] = [
  { l: "Gang Sheet Builder", d: "Auto-layout optimized gang sheets", to: "/product/gang-sheet-builder" },
  { l: "Website Integration", d: "Embed builder on any website", to: "/product/website-integration" },
  { l: "Quick Store", d: "Full storefront, zero coding", to: "/product/quick-store" },
  { l: "Order Automation", d: "Daily orders → gang sheet in seconds", to: "/product/order-automation", badge: "Soon" },
];

const navLinks = [
  { l: "Pricing", to: "/pricing" },
  { l: "FAQ", to: "/faq" },
  { l: "Contact", to: "/contact" },
];

const MOBILE_BP = 768;

export default function MarketingNav() {
  const [dd, setDd] = useState(false);
  const [mob, setMob] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < MOBILE_BP : false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { setMob(false); }, [location]);

  useEffect(() => {
    if (mob) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mob]);

  return (
    <>
      <div style={{ position: "fixed", top: 16, left: 0, right: 0, zIndex: 100, padding: isMobile ? "0 16px" : "0 32px" }}>
        <nav style={{
          maxWidth: 960, margin: "0 auto",
          background: "linear-gradient(135deg, #1E1B4B, #252272, #1E1B4B)",
          borderRadius: 16,
          padding: isMobile ? "0 12px 0 16px" : "0 8px 0 24px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          boxShadow: "0 8px 32px rgba(15,13,46,0.5), 0 2px 8px rgba(0,0,0,0.2)",
        }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/DTF-Layout-WHITE-logo-text.png" alt="DTF Layout" style={{ height: 38, width: "auto", display: "block" }} />
          </Link>

          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link to="/" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", padding: "8px 14px", textDecoration: "none" }}>Home</Link>
              <div style={{ position: "relative" }} onMouseEnter={() => setDd(true)} onMouseLeave={() => setDd(false)}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 10, background: dd ? "rgba(255,255,255,0.08)" : "transparent", transition: "background 0.2s" }}>
                  Product {chevIcon}
                </span>
                {dd && (
                  <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 260, paddingTop: 10 }}>
                    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", boxShadow: "0 20px 56px rgba(0,0,0,0.15)", padding: 5 }}>
                      {productDropdownItems.map((it, i) => (
                        <Link key={i} to={it.to} style={{ padding: "10px 12px", borderRadius: 10, display: "block", textDecoration: "none" }}
                          onMouseEnter={(e: any) => e.currentTarget.style.background = "#EEF2FF"}
                          onMouseLeave={(e: any) => e.currentTarget.style.background = "transparent"}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{it.l}</span>
                            {it.badge && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                padding: "2px 7px",
                                borderRadius: 99,
                                background: "rgba(16,185,129,0.12)",
                                color: "#047857",
                                border: "1px solid rgba(16,185,129,0.25)",
                              }}>{it.badge}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{it.d}</div>
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
          )}

          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {user ? (
                <button onClick={() => navigate("/app")} style={{ fontFamily: BF, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(79,70,229,0.4)" }}>Go to App →</button>
              ) : (
                <>
                  <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", padding: "8px 14px", textDecoration: "none" }}>Login</Link>
                  <button onClick={() => navigate("/signup")} style={{ fontFamily: BF, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(79,70,229,0.4)" }}>Register →</button>
                </>
              )}
            </div>
          )}

          {isMobile && (
            <button onClick={() => setMob(!mob)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Toggle menu">
              {mob ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          )}
        </nav>
      </div>

      {isMobile && mob && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "linear-gradient(180deg, #1E1B4B 0%, #0F0D2E 100%)", paddingTop: 88, overflowY: "auto" }}>
          <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 4 }}>
            <Link to="/" style={{ fontSize: 18, fontWeight: 600, fontFamily: HF, color: "#fff", padding: "14px 0", textDecoration: "none", borderBottom: "1px solid rgba(99,102,241,0.15)" }}>Home</Link>
            <div style={{ borderBottom: "1px solid rgba(99,102,241,0.15)", paddingBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: HF, color: "#fff", padding: "14px 0 8px" }}>Product</div>
              {productDropdownItems.map((it, i) => (
                <Link key={i} to={it.to} style={{ display: "block", padding: "10px 16px", textDecoration: "none", borderRadius: 10, marginBottom: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#C7D2FE" }}>{it.l}</span>
                    {it.badge && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "2px 7px",
                        borderRadius: 99,
                        background: "rgba(16,185,129,0.18)",
                        color: "#6EE7B7",
                        border: "1px solid rgba(16,185,129,0.3)",
                      }}>{it.badge}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(165,180,252,0.6)", marginTop: 2 }}>{it.d}</div>
                </Link>
              ))}
            </div>
            {navLinks.map(item => (
              <Link key={item.l} to={item.to} style={{ fontSize: 18, fontWeight: 600, fontFamily: HF, color: "#fff", padding: "14px 0", textDecoration: "none", borderBottom: "1px solid rgba(99,102,241,0.15)" }}>{item.l}</Link>
            ))}
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {user ? (
                <button onClick={() => navigate("/app")} style={{ fontFamily: BF, fontWeight: 600, fontSize: 16, cursor: "pointer", padding: "14px 0", borderRadius: 12, width: "100%", background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(79,70,229,0.4)" }}>Go to App →</button>
              ) : (
                <>
                  <button onClick={() => navigate("/signup")} style={{ fontFamily: BF, fontWeight: 600, fontSize: 16, cursor: "pointer", padding: "14px 0", borderRadius: 12, width: "100%", background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(79,70,229,0.4)" }}>Register →</button>
                  <button onClick={() => navigate("/login")} style={{ fontFamily: BF, fontWeight: 500, fontSize: 15, cursor: "pointer", padding: "12px 0", borderRadius: 12, width: "100%", background: "rgba(255,255,255,0.08)", color: "#C7D2FE", border: "1px solid rgba(99,102,241,0.3)" }}>Login</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
