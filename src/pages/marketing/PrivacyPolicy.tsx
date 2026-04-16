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
.policy-section ul{margin:0 0 16px;padding-left:22px;display:flex;flex-direction:column;gap:8px}
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

export default function PrivacyPolicy() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  useEffect(() => { const l1 = document.createElement("link"); l1.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"; l1.rel = "stylesheet"; document.head.appendChild(l1); return () => { document.head.removeChild(l1); }; }, []);
  useEffect(() => { if (!document.querySelector("style[data-dtf-privacy]")) { const tag = document.createElement("style"); tag.setAttribute("data-dtf-privacy", "1"); tag.textContent = ANIM_CSS; document.head.appendChild(tag); } return () => { const tag = document.querySelector("style[data-dtf-privacy]"); if (tag) tag.remove(); }; }, []);

  return (
    <div style={{ fontFamily: BF, color: "#111827", overflowX: "hidden" }}>
      <MarketingNav />

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #050412 0%, #08061A 5%, #0A0820 10%, #0D0B26 14%, #0F0D2E 19%, #141138 24%, #1A1744 29%, #1E1B4B 34%, #272368 39%, #312E81 44%, #4F46E5 54%, #6366F1 61%, #818CF8 68%, #A5B4FC 75%, #C7D2FE 82%, #E0E7FF 88%, #F5F5F7 94%, #FAFAFB 100%)", padding: isMobile ? "0 16px 0" : "0 40px 0" }}>
        <Dots o={0.04} /><MovingPattern />
        <div style={{ padding: isMobile ? "100px 0 0" : "140px 0 0" }}>
          <Sq top={20} right={140} size={32} rotate={18} /><Sq top={100} right={80} size={22} rotate={-12} /><Sq top={30} left={100} size={28} rotate={22} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> Legal</Pill>
            <h1 style={{ fontFamily: HF, fontSize: isMobile ? 48 : 60, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "28px 0 20px" }}>Privacy Policy</h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>How we collect, store, and protect your data at DTF Layout — explained in plain language.</p>
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
            This Privacy Policy explains how <strong>Data Canvas Tech</strong> ("DTF Layout", "we", "us", "our") collects,
            uses, shares, and protects personal information when you use our Service. DTF Layout is a Mumbai-based software
            platform for Direct-to-Film printing businesses. We take data protection seriously and aim to explain our
            practices in plain language.
          </p>

          <Section id="scope" title="1. Who This Policy Covers">
            <p>This Policy applies to:</p>
            <ul>
              <li><strong>Customers</strong> — printers, designers, and other businesses that hold a DTF Layout account;</li>
              <li><strong>Visitors</strong> — anyone who visits our marketing website at dtflayout.com; and</li>
              <li><strong>End Customers</strong> — the customers of our Customers, who interact with our software through a Website Integration builder embedded on a printer's site, or through a Quick Store hosted at a subdomain of dtflayout.com.</li>
            </ul>
            <p>If you are an End Customer of a printer using our software, the printer is primarily responsible for their relationship with you. We recommend that you read the printer's own privacy policy. This Policy describes the limited role we play as the underlying software provider.</p>
          </Section>

          <Section id="role" title="2. Our Role — Controller and Processor">
            <p>We act in two different roles depending on the type of data:</p>
            <ul>
              <li><strong>Controller</strong> — for data about our direct Customers, for visitors to our marketing site, and for operational data (such as logs and security events). In this role, we decide the purposes and means of processing.</li>
              <li><strong>Processor</strong> — for End-Customer data processed through our Customers' Website Integration builders or Quick Stores. In that context, our Customer (the printer) determines the purposes and means of processing, and we process the data on their behalf.</li>
            </ul>
            <p>If you are an End Customer and you want to exercise data-protection rights — for example, access, correction, or deletion — please contact the printer you ordered from. We will assist them within a reasonable time.</p>
          </Section>

          <Section id="what-we-collect" title="3. What We Collect">
            <h3>Customer account information</h3>
            <p>When you sign up: name, email address, password, business name, optional phone number, country or region, and billing information collected at checkout.</p>

            <h3>Usage information</h3>
            <p>Credit balance and transaction history, gang sheets generated, uploaded images and design files, store setup configuration, and builder settings (colours, fonts, logos).</p>

            <h3>End-Customer information (processed on behalf of our Customer)</h3>
            <p>Depending on the Customer's setup, we may process:</p>
            <ul>
              <li>Email address (for order confirmation and, in Quick Store, passwordless login);</li>
              <li>Name, phone number, and address (only if collected by the Customer's checkout);</li>
              <li>Uploaded images and design files; and</li>
              <li>Order metadata (sheet dimensions, quantity, status, timestamps).</li>
            </ul>

            <h3>Payment information</h3>
            <p>We do <strong>not</strong> store full payment card details. Payments are handled by our payment partner, which returns limited information to us (such as the last four digits of the card, a transaction identifier, the amount, and the status) for reconciliation, refunds, and fraud detection.</p>

            <h3>Technical information</h3>
            <p>IP address, browser type, operating system, device identifiers, referring URL, timestamps, and error or performance telemetry from the Service.</p>

            <h3>Usage analytics</h3>
            <p>Anonymous or pseudonymous information about how the Service is used — such as page views, feature interactions, and traffic source — used to understand and improve the Service, not to identify individuals.</p>

            <h3>Communications</h3>
            <p>Messages you send to <a href="mailto:support@dtflayout.com">support@dtflayout.com</a>, contact-form submissions, and any feedback you provide.</p>
          </Section>

          <Section id="how-we-use" title="4. How We Use Personal Information">
            <p>We use personal information to:</p>
            <ul>
              <li><strong>Provide the Service</strong> — create and authenticate your account, process payments, store and generate gang sheets, and send order notifications;</li>
              <li><strong>Operate End-Customer features on behalf of our Customers</strong> — serve Website Integration builders and Quick Store storefronts, handle login, and store uploaded design files;</li>
              <li><strong>Secure the Service</strong> — detect abuse, prevent fraud, enforce rate limits, and investigate security incidents;</li>
              <li><strong>Communicate with you</strong> — respond to support requests, send transactional emails, and notify you of material changes to the Service;</li>
              <li><strong>Improve the Service</strong> — understand which features are used, diagnose issues, and measure performance; and</li>
              <li><strong>Comply with law</strong> — meet our tax, accounting, and fraud-prevention obligations, and respond to valid legal requests.</li>
            </ul>
          </Section>

          <Section id="legal-basis" title="5. Legal Basis for Processing">
            <p>If you are in a jurisdiction that requires a specific legal basis for processing (such as the EU, UK, or India under the Digital Personal Data Protection Act, 2023), we rely on one or more of the following:</p>
            <ul>
              <li><strong>Contract</strong> — to provide the Service you signed up for;</li>
              <li><strong>Legitimate interests</strong> — for security, fraud prevention, and product analytics, where those interests are not overridden by your rights;</li>
              <li><strong>Legal obligation</strong> — for tax, accounting, and regulatory record-keeping; and</li>
              <li><strong>Consent</strong> — for cookies that are not strictly necessary, and for any other processing where consent is required by law. You can withdraw consent at any time.</li>
            </ul>
          </Section>

          <Section id="service-providers" title="6. Service Providers">
            <p>To operate the Service, we rely on a small number of trusted third-party providers. These include:</p>
            <ul>
              <li>Cloud hosting, database, and file-storage providers;</li>
              <li>Payment-processing providers;</li>
              <li>Transactional email providers (for account notifications and login codes);</li>
              <li>Security, rate-limiting, and error-monitoring providers; and</li>
              <li>Product- and marketing-analytics providers.</li>
            </ul>
            <p>Each provider is contractually bound to handle personal information in line with our instructions and applicable data-protection laws, and is permitted to use that information only to perform services for us. Some of these providers are located outside India; see Section 8.</p>
            <p>If you are an enterprise customer and need a detailed list of our sub-processors for your data-processing agreement, contact <a href="mailto:support@dtflayout.com">support@dtflayout.com</a> and we will provide one.</p>
          </Section>

          <Section id="sharing" title="7. Sharing and Disclosure">
            <p>We do <strong>not</strong> sell your personal information, and we do <strong>not</strong> share it for third-party advertising.</p>
            <p>We may share personal information:</p>
            <ul>
              <li>With our service providers as described above, for the limited purposes of operating the Service;</li>
              <li>With the Customer who operates the store through which an End Customer placed an order — this is the core purpose of the Website Integration and Quick Store products;</li>
              <li>With professional advisors (lawyers, accountants, auditors) under confidentiality obligations;</li>
              <li>As required by law, legal process, or to protect our rights, safety, or property; and</li>
              <li>In connection with a merger, acquisition, or sale of assets, subject to equivalent privacy commitments.</li>
            </ul>
          </Section>

          <Section id="transfers" title="8. International Data Transfers">
            <p>We are based in India, and some of our service providers store data in other countries. By using the Service, you acknowledge that your personal information may be transferred to and processed in jurisdictions whose data-protection laws may differ from those of your home country. Where required by law, we rely on standard contractual clauses or equivalent safeguards for these transfers.</p>
          </Section>

          <Section id="retention" title="9. Data Retention">
            <p>We keep personal information only for as long as we need it for the purposes described in this Policy:</p>
            <ul>
              <li><strong>Account information</strong> — for the duration of your account, plus a reasonable period after closure to handle disputes and comply with legal obligations;</li>
              <li><strong>Uploaded design files</strong> — automatically scheduled for deletion a short period after an order is marked paid or downloaded, followed by a grace period before permanent removal. You are responsible for downloading any files you wish to keep before they expire;</li>
              <li><strong>Order and credit records</strong> — retained for the period required by applicable tax and accounting law;</li>
              <li><strong>Usage and analytics data</strong> — retained for a limited period and then deleted or aggregated;</li>
              <li><strong>Support communications</strong> — retained for a reasonable period to handle follow-up questions and disputes; and</li>
              <li><strong>Backups</strong> — encrypted backups may persist for a short period after deletion of the source data.</li>
            </ul>
            <p>If you delete your account or close your Quick Store, data will begin to be purged on these schedules. Some information retained for security and fraud investigation may be kept longer in aggregated or de-identified form.</p>
          </Section>

          <Section id="cookies" title="10. Cookies and Similar Technologies">
            <p>We use a small number of cookies and similar technologies:</p>
            <ul>
              <li><strong>Strictly necessary</strong> — for authentication, session continuity, CSRF protection, and rate limiting. You cannot opt out of these without breaking core functionality;</li>
              <li><strong>Analytics</strong> — to measure and improve the Service; and</li>
              <li><strong>Attribution</strong> — a pseudonymous identifier stored locally that helps us understand which marketing channels bring us new users.</li>
            </ul>
            <p>Your browser allows you to block or delete cookies. Blocking strictly-necessary cookies will prevent you from using the Service.</p>
          </Section>

          <Section id="security" title="11. Security">
            <p>We take reasonable technical and organisational measures to protect personal information, including encryption in transit, encryption at rest for file storage and backups, access controls and least-privilege principles for our team, and rate limiting and monitoring on sensitive endpoints.</p>
            <p>No system is perfectly secure. If we become aware of a breach that materially affects your personal information, we will notify you and the relevant authority as required by applicable law.</p>
          </Section>

          <Section id="rights" title="12. Your Rights">
            <p>Depending on your jurisdiction, you may have some or all of the following rights:</p>
            <ul>
              <li><strong>Access</strong> — to know what personal information we hold about you;</li>
              <li><strong>Correction</strong> — to ask us to correct inaccurate information;</li>
              <li><strong>Deletion</strong> — to ask us to delete your information, subject to legal retention obligations;</li>
              <li><strong>Portability</strong> — to receive your data in a machine-readable format;</li>
              <li><strong>Objection or restriction</strong> — to object to processing based on legitimate interests, or to restrict processing;</li>
              <li><strong>Withdraw consent</strong> — where consent is the legal basis; and</li>
              <li><strong>Complaint</strong> — to lodge a complaint with a data-protection authority. For India, this will be the Data Protection Board once operational; for the EU or UK, your local supervisory authority.</li>
            </ul>
            <p>To exercise these rights, email us at <a href="mailto:support@dtflayout.com">support@dtflayout.com</a>. We will respond within a reasonable time, typically within 30 days. We may need to verify your identity before acting on a request.</p>
            <p>If you are an End Customer of a printer using our software, your rights should be exercised with that printer first — they are the controller of your relationship with them.</p>
          </Section>

          <Section id="children" title="13. Children">
            <p>The Service is not directed to individuals under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please email <a href="mailto:support@dtflayout.com">support@dtflayout.com</a> and we will delete it.</p>
          </Section>

          <Section id="third-party" title="14. Third-Party Links and Integrations">
            <p>The Service may link to or integrate with third-party services (for example, your own website or e-commerce platform). Those services have their own privacy policies, and we are not responsible for how they handle your data.</p>
          </Section>

          <Section id="changes" title="15. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. Material changes will be notified by email or through a notice in the Service. The "last updated" date below indicates when the Policy was most recently changed. Continued use of the Service after an update means you accept the revised Policy.</p>
          </Section>

          <Section id="contact" title="16. Contact">
            <p>Questions, requests, or complaints? Email us at <a href="mailto:support@dtflayout.com">support@dtflayout.com</a>.</p>
            <p style={{ marginBottom: 0 }}><strong>Data Canvas Tech</strong><br />Mumbai, Maharashtra, India</p>
          </Section>

          <p style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF", marginTop: 48 }}>Last updated: April 2026</p>
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
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</h4>{[{ l: "Gang Sheet Builder", to: "/product/gang-sheet-builder" }, { l: "Website Integration", to: "/product/website-integration" }, { l: "Quick Store", to: "/product/quick-store" }, { l: "Pricing", to: "/pricing" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
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
