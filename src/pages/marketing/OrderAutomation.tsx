/**
 * marketing/OrderAutomation.tsx — public marketing-site page.
 * Lives at /product/order-automation. Linked from the Product dropdown
 * in MarketingNav and from the Product column of the marketing footer.
 *
 * The page body comes from <OrderAutomationContent />, which is also
 * used by the dashboard version at /app/order-automation. Both pages
 * are visually identical — only the chrome differs (marketing nav +
 * footer here, vs sidebar via AppLayout in the dashboard version).
 *
 * Design choice: page body uses Tailwind (shared component); chrome
 * (nav + footer) follows the marketing-page convention of inline
 * styles + the existing MarketingNav. Tailwind classes work fine in
 * this context — they're just CSS.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import { OrderAutomationContent } from "@/components/order-automation";

const MarketingOrderAutomation = () => {
  // Match the responsive pattern used by other marketing pages
  // (Home.tsx, WebsiteIntegration.tsx, etc.) for the inlined footer.
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div style={{ position: "relative", overflowX: "hidden" }}>
      <MarketingNav />

      {/* Top spacer pushes content below the fixed marketing nav (height ~80px). */}
      <main style={{ paddingTop: 80 }}>
        <OrderAutomationContent pageContext="marketing" />
      </main>

      {/* ── Footer — duplicated from other marketing pages so it matches.
            When this footer is finally extracted to a shared component,
            this whole block will be replaced with <MarketingFooter />. ── */}
      <footer
        style={{
          position: "relative",
          padding: isMobile ? "0 16px 24px" : "0 40px 32px",
          background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)",
          color: "rgba(165,180,252,0.6)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.3) 20%, rgba(129,140,248,0.5) 50%, rgba(99,102,241,0.3) 80%, transparent 95%)",
          }}
        />
        <div style={{ paddingTop: 64 }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr",
                gap: 48,
                marginBottom: 48,
              }}
            >
              <div>
                <div style={{ marginBottom: 16 }}>
                  <img
                    src="/DTF-Layout-WHITE-logo-text.png"
                    alt="DTF Layout"
                    style={{ height: 38, width: "auto", display: "block" }}
                  />
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>
                  Smart DTF sheet builder for printers worldwide. Auto-arrange,
                  optimize, and print — all from one platform.
                </p>
              </div>

              <div>
                <h4
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#A5B4FC",
                    marginBottom: 16,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Product
                </h4>
                {[
                  { l: "Gang Sheet Builder", to: "/product/gang-sheet-builder" },
                  { l: "Website Integration", to: "/product/website-integration" },
                  { l: "Quick Store", to: "/product/quick-store" },
                  { l: "Order Automation", to: "/product/order-automation" },
                  { l: "Pricing", to: "/pricing" },
                ].map((item) => (
                  <Link
                    key={item.l}
                    to={item.to}
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      display: "block",
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    {item.l}
                  </Link>
                ))}
              </div>

              <div>
                <h4
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#A5B4FC",
                    marginBottom: 16,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Company
                </h4>
                {[
                  { l: "FAQ", to: "/faq" },
                  { l: "Contact", to: "/contact" },
                  { l: "Blog", to: "/" },
                ].map((item) => (
                  <Link
                    key={item.l}
                    to={item.to}
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      display: "block",
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    {item.l}
                  </Link>
                ))}
              </div>

              <div>
                <h4
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#A5B4FC",
                    marginBottom: 16,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Legal
                </h4>
                {[
                  { l: "Privacy Policy", to: "/privacy-policy" },
                  { l: "Terms & Conditions", to: "/terms-conditions" },
                  { l: "Refund Policy", to: "/refund-policy" },
                ].map((item) => (
                  <Link
                    key={item.l}
                    to={item.to}
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      display: "block",
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    {item.l}
                  </Link>
                ))}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(99,102,241,0.12)",
                paddingTop: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13 }}>
                © 2026 DTF Layout · Data Canvas Tech. All rights reserved.
              </span>
              <span style={{ fontSize: 13 }}>support@dtflayout.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingOrderAutomation;
