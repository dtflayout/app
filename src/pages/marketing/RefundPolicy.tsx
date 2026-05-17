import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";

/* ══════════ DESIGN TOKENS ══════════ */
const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";
const P = "#4F46E5";

/* ══════════ SHARED COMPONENTS ══════════ */
function Sq({ top, left, right, bottom, size = 28, rotate = 12 }: any) { const p: any = {}; if (top != null) p.top = top; if (left != null) p.left = left; if (right != null) p.right = right; if (bottom != null) p.bottom = bottom; return <div style={{ position: "absolute", width: size, height: size, borderRadius: size * 0.25, border: "1.5px dashed rgba(79,70,229,0.1)", transform: `rotate(${rotate}deg)`, pointerEvents: "none", ...p }} />; }
function Dots({ o = 0.2 }: { o?: number }) { return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: o, backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />; }
function Pill({ children }: any) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, fontFamily: BF, background: "#EEF2FF", color: P, border: "1px solid #C7D2FE" }}>{children}</span>; }
function MovingPattern() { return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}><div className="orb orb-1" style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)", top: "-15%", left: "-10%", filter: "blur(40px)" }} /><div className="orb orb-2" style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)", top: "15%", right: "-12%", filter: "blur(30px)" }} /><div className="orb orb-3" style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(165,180,252,0.35) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)", bottom: "5%", left: "25%", filter: "blur(35px)" }} /><div className="grid-drift" style={{ position: "absolute", inset: "-50%", width: "200%", height: "200%", opacity: 0.18, backgroundImage: "linear-gradient(rgba(165,180,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(165,180,252,0.3) 1px, transparent 1px)", backgroundSize: "80px 80px" }} /></div>; }

const ANIM_CSS = `
@keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(60px,40px) scale(1.1)}50%{transform:translate(20px,80px) scale(0.95)}75%{transform:translate(-40px,30px) scale(1.05)}}
@keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-50px,60px) scale(1.08)}50%{transform:translate(-80px,20px) scale(0.92)}75%{transform:translate(-20px,-40px) scale(1.03)}}
@keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(70px,-30px) scale(1.12)}66%{transform:translate(-30px,-60px) scale(0.9)}}
@keyframes gridDrift{0%{transform:translate(0,0)}100%{transform:translate(60px,60px)}}
.orb-1{animation:orbFloat1 8s ease-in-out infinite}.orb-2{animation:orbFloat2 10s ease-in-out infinite}.orb-3{animation:orbFloat3 7s ease-in-out infinite}.grid-drift{animation:gridDrift 8s linear infinite}
.policy-section{scroll-margin-top:100px}
.policy-section h2{font-family:${HF};font-size:26px;font-weight:700;color:#111827;letter-spacing:-0.01em;margin:0 0 18px;line-height:1.25}
.policy-section h3{font-family:${HF};font-size:17px;font-weight:700;color:#1F2937;margin:22px 0 10px;line-height:1.35}
.policy-section p{margin:0 0 16px;font-size:15px;color:#374151;line-height:1.75}
.policy-section ul, .policy-section ol{margin:0 0 16px;padding-left:22px;display:flex;flex-direction:column;gap:8px}
.policy-section li{font-size:15px;color:#374151;line-height:1.7}
.policy-section li::marker{color:${P}}
.policy-section strong{color:#111827;font-weight:600}
.policy-section a{color:${P};text-decoration:none;font-weight:500}
.policy-section a:hover{text-decoration:underline}
`;

/* ══════════ CONTENT HELPERS ══════════ */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="policy-section" style={{ padding: "32px 0", borderTop: "1px solid #F3F4F6" }}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function RefundPolicy() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  useEffect(() => { const l1 = document.createElement("link"); l1.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"; l1.rel = "stylesheet"; document.head.appendChild(l1); return () => { document.head.removeChild(l1); }; }, []);
  useEffect(() => { if (!document.querySelector("style[data-dtf-refund]")) { const tag = document.createElement("style"); tag.setAttribute("data-dtf-refund", "1"); tag.textContent = ANIM_CSS; document.head.appendChild(tag); } return () => { const tag = document.querySelector("style[data-dtf-refund]"); if (tag) tag.remove(); }; }, []);

  return (
    <div style={{ fontFamily: BF, color: "#111827", overflowX: "hidden" }}>
      <MarketingNav />

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #050412 0%, #08061A 5%, #0A0820 10%, #0D0B26 14%, #0F0D2E 19%, #141138 24%, #1A1744 29%, #1E1B4B 34%, #272368 39%, #312E81 44%, #4F46E5 54%, #6366F1 61%, #818CF8 68%, #A5B4FC 75%, #C7D2FE 82%, #E0E7FF 88%, #F5F5F7 94%, #FAFAFB 100%)", padding: isMobile ? "0 16px 0" : "0 40px 0" }}>
        <Dots o={0.04} /><MovingPattern />
        <div style={{ padding: isMobile ? "100px 0 0" : "140px 0 0" }}>
          <Sq top={20} right={140} size={32} rotate={18} /><Sq top={100} right={80} size={22} rotate={-12} /><Sq top={30} left={100} size={28} rotate={22} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-9-9" /><polyline points="21 3 21 9 15 9" /></svg> Legal</Pill>
            <h1 style={{ fontFamily: HF, fontSize: isMobile ? 48 : 60, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "28px 0 20px" }}>Refund &amp; Cancellation Policy</h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>How cancellations and refunds work for DTF Layout, and the specific situations where a refund is available.</p>
          </div>
          <div style={{ height: 120, background: "linear-gradient(180deg, transparent, #FAFAFB)" }} />
        </div>
      </section>

      {/* ═══ CONTENT ═══ */}
      <section style={{ padding: isMobile ? "0 16px 80px" : "0 40px 120px", position: "relative", marginTop: -40 }}>
        <Dots o={0.03} />
        <Sq top={40} left={60} size={26} rotate={18} /><Sq bottom={80} right={80} size={22} rotate={-12} />
        <div style={{ maxWidth: 820, margin: "0 auto", position: "relative", zIndex: 10, background: "#fff", borderRadius: 20, padding: isMobile ? "32px 24px" : "56px 64px", border: "1px solid #E5E7EB", boxShadow: "0 4px 24px rgba(0,0,0,0.03)" }}>

          <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 8px", fontWeight: 500 }}>Effective date: 16 April 2026</p>
          <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.75, margin: "0 0 8px" }}>
            This Refund Policy applies to purchases made from <strong>Data Canvas Tech</strong> ("DTF Layout") through
            dtflayout.com. It should be read together with our{" "}
            <Link to="/terms-conditions" style={{ color: P, fontWeight: 500, textDecoration: "none" }}>Terms &amp; Conditions</Link> and{" "}
            <Link to="/privacy-policy" style={{ color: P, fontWeight: 500, textDecoration: "none" }}>Privacy Policy</Link>.
          </p>

          <Section id="overview" title="1. Overview">
            <p>DTF Layout sells pre-paid credits that are delivered and used digitally. Because credits are a digital good consumed by software, <strong>they are generally non-refundable</strong> once purchased. This policy sets out the narrow situations where a refund is available, and explains how to request one.</p>
            <p>Before you buy, we strongly recommend that you use our <strong>free 20,000 sq.in trial</strong>. The trial gives you full access to every feature of the Service — the Gang Sheet Builder, Website Integration, and Quick Store — without any payment, so you can decide whether DTF Layout is a fit for your business before you spend money.</p>
          </Section>

          <Section id="non-refundable" title="2. General Rule — Credits Are Non-Refundable">
            <p>Once a credit plan is purchased and the credits are added to your account, <strong>those credits are non-refundable</strong>, whether or not you have used them.</p>
            <p>Credits do not expire. You can use them at your own pace. If DTF Layout stops being a fit for your business, you are welcome to stop using the Service — the credits remain in your account in case you ever come back, but no cash refund is provided.</p>
          </Section>

          <Section id="exceptions" title="3. Narrow Exceptions Where We Will Refund">
            <p>We will review refund requests in the following specific situations:</p>

            <h3>(a) Duplicate charges</h3>
            <p>If you were charged more than once for the same plan due to a processing error, we will refund the duplicate charge in full.</p>

            <h3>(b) Billing errors on our side</h3>
            <p>If we charged the wrong amount, charged the wrong account, or charged you after you cancelled a checkout, we will correct the error and refund the incorrect amount.</p>

            <h3>(c) Technical failure preventing use</h3>
            <p>If a verified technical failure on our side prevents you from using the credits you purchased, <em>and</em> you report the failure within <strong>seven (7) days of purchase</strong>, <em>and</em> no credits have been consumed, we will refund the purchase in full.</p>

            <h3>(d) Fraudulent or unauthorised charge</h3>
            <p>If your payment method was used without your authorisation, contact us immediately and we will work with Dodo Payments to investigate and, where appropriate, reverse the charge.</p>

            <p>Outside these four situations, refunds are not available.</p>
          </Section>

          <Section id="not-eligible" title="4. What Is Not Eligible for a Refund">
            <p>To set clear expectations, the following are not refundable:</p>
            <ul>
              <li>Credits that have been used or partially used;</li>
              <li>Dissatisfaction with output files, layout quality, colour, image placement, or print results produced by your own printer or RIP software;</li>
              <li>Change of mind after the purchase is complete;</li>
              <li>Account suspension or termination caused by your breach of our Terms &amp; Conditions or Acceptable Use policy;</li>
              <li>Downtime, errors, or outages that do not permanently prevent access to your credits;</li>
              <li>Third-party issues — for example, problems with your printer hardware, film, ink, RIP software, or your own website; and</li>
              <li>Failure to read the plan details before purchase (each plan's credit allotment is displayed on the Pricing page before checkout).</li>
            </ul>
          </Section>

          <Section id="how-to-request" title="5. How to Request a Refund">
            <p>Email <a href="mailto:support@dtflayout.com">support@dtflayout.com</a> with the following information:</p>
            <ol>
              <li>The email address on your DTF Layout account;</li>
              <li>The date of the purchase;</li>
              <li>The Dodo Payments transaction ID (from the receipt email you received after paying);</li>
              <li>Which of the four exceptions in Section 3 you believe applies; and</li>
              <li>A brief description of what happened.</li>
            </ol>
            <p>We aim to respond to refund requests within <strong>three (3) business days</strong> and, where approved, to process the refund within <strong>seven (7) to fourteen (14) business days</strong>. Refunds are returned to the original payment method. Depending on your bank or card issuer, it may take additional time for the refund to appear on your statement.</p>
          </Section>

          <Section id="cancellations" title="6. Cancellations">
            <p>DTF Layout does <strong>not</strong> sell subscriptions — there is nothing to cancel. You simply stop buying additional credits. Credits you have already paid for remain in your account until used.</p>
            <p>You may delete your account at any time by emailing <a href="mailto:support@dtflayout.com">support@dtflayout.com</a>. Deleting your account forfeits any remaining credit balance; unused credits are not refunded on account deletion, except in the narrow situations described in Section 3.</p>
          </Section>

          <Section id="termination" title="7. Account Termination by Us">
            <p>If we terminate your account because you breached our Terms &amp; Conditions — for example, by misusing the Service, uploading prohibited content, or engaging in fraudulent activity — any remaining credits are forfeited and are not refundable.</p>
            <p>If we terminate your account for reasons unrelated to your conduct (for example, if we discontinue the Service entirely), we will consider refund requests for unused credits on a case-by-case basis.</p>
          </Section>

          <Section id="chargebacks" title="8. Chargebacks">
            <p>If you dispute a charge directly with your card issuer or Dodo Payments (a "chargeback") without first contacting us to resolve the issue, we reserve the right to <strong>suspend your account</strong> while the dispute is open. Where a chargeback is later determined to be invalid, we may reinstate the original charge and any associated fees.</p>
            <p>We much prefer you to email <a href="mailto:support@dtflayout.com">support@dtflayout.com</a> first — most issues can be resolved the same day, and a direct refund (where eligible) is faster and simpler than a chargeback.</p>
          </Section>

          <Section id="changes" title="9. Changes to This Policy">
            <p>We may update this Refund Policy from time to time. Changes apply only to purchases made after the updated policy is posted. The "last updated" date below indicates when the Policy was last changed.</p>
          </Section>

          <Section id="contact" title="10. Contact">
            <p>For any refund question or billing issue, email <a href="mailto:support@dtflayout.com">support@dtflayout.com</a>. We respond to every message.</p>
            <p style={{ marginBottom: 0 }}><strong>Data Canvas Tech</strong><br />Mumbai, Maharashtra, India</p>
          </Section>

          <div style={{ marginTop: 40, padding: isMobile ? "22px 20px" : "28px 32px", borderRadius: 16, background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)", border: "1px solid #C7D2FE", display: "flex", gap: 16, alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row" }}>
            <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(79,70,229,0.1)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: HF, fontSize: 15, fontWeight: 700, color: "#1E1B4B", marginBottom: 4 }}>Need help with a billing issue?</div>
              <div style={{ fontSize: 14, color: "#4B5563" }}>Reach us at <a href="mailto:support@dtflayout.com" style={{ color: P, fontWeight: 600, textDecoration: "none" }}>support@dtflayout.com</a> — we respond to every message.</div>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF", marginTop: 32 }}>Last updated: April 2026</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", padding: isMobile ? "0 16px 24px" : "0 40px 32px", background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)", color: "rgba(165,180,252,0.6)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.3) 20%, rgba(129,140,248,0.5) 50%, rgba(99,102,241,0.3) 80%, transparent 95%)" }} />
        <div style={{ paddingTop: 64 }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
              <div>
                <div style={{ marginBottom: 16 }}><img src="/DTF-Layout-WHITE-logo-text.png" alt="DTF Layout" style={{ height: 38, width: "auto", display: "block" }} /></div>
                <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>Smart DTF sheet builder for printers worldwide. Auto-arrange, optimize, and print — all from one platform.</p>
              </div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</h4>{[{ l: "Gang Sheet Builder", to: "/product/gang-sheet-builder" }, { l: "Website Integration", to: "/product/website-integration" }, { l: "Quick Store", to: "/product/quick-store" }, { l: "Order Automation", to: "/product/order-automation" }, { l: "Pricing", to: "/pricing" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</h4>{[{ l: "FAQ", to: "/faq" }, { l: "Contact", to: "/contact" }, { l: "Blog", to: "/" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Legal</h4>{[{ l: "Privacy Policy", to: "/privacy-policy" }, { l: "Terms & Conditions", to: "/terms-conditions" }, { l: "Refund Policy", to: "/refund-policy" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>© 2026 DTF Layout · Data Canvas Tech. All rights reserved.</span>
              <span style={{ fontSize: 13, cursor: "pointer" }}>support@dtflayout.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
