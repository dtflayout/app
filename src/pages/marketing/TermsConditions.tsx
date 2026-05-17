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

export default function TermsConditions() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  useEffect(() => { const l1 = document.createElement("link"); l1.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"; l1.rel = "stylesheet"; document.head.appendChild(l1); return () => { document.head.removeChild(l1); }; }, []);
  useEffect(() => { if (!document.querySelector("style[data-dtf-terms]")) { const tag = document.createElement("style"); tag.setAttribute("data-dtf-terms", "1"); tag.textContent = ANIM_CSS; document.head.appendChild(tag); } return () => { const tag = document.querySelector("style[data-dtf-terms]"); if (tag) tag.remove(); }; }, []);

  return (
    <div style={{ fontFamily: BF, color: "#111827", overflowX: "hidden" }}>
      <MarketingNav />

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #050412 0%, #08061A 5%, #0A0820 10%, #0D0B26 14%, #0F0D2E 19%, #141138 24%, #1A1744 29%, #1E1B4B 34%, #272368 39%, #312E81 44%, #4F46E5 54%, #6366F1 61%, #818CF8 68%, #A5B4FC 75%, #C7D2FE 82%, #E0E7FF 88%, #F5F5F7 94%, #FAFAFB 100%)", padding: isMobile ? "0 16px 0" : "0 40px 0" }}>
        <Dots o={0.04} /><MovingPattern />
        <div style={{ padding: isMobile ? "100px 0 0" : "140px 0 0" }}>
          <Sq top={20} right={140} size={32} rotate={18} /><Sq top={100} right={80} size={22} rotate={-12} /><Sq top={30} left={100} size={28} rotate={22} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> Legal</Pill>
            <h1 style={{ fontFamily: HF, fontSize: isMobile ? 48 : 60, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "28px 0 20px" }}>Terms &amp; Conditions</h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>The rules for using DTF Layout — what we provide, what you agree to, and how we handle your account.</p>
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
            These Terms and Conditions (the <strong>"Terms"</strong>) govern your access to and use of DTF Layout (the <strong>"Service"</strong>),
            a software platform operated by <strong>Data Canvas Tech</strong> (<strong>"we"</strong>, <strong>"us"</strong>, <strong>"our"</strong>),
            based in Mumbai, Maharashtra, India. The Service is available at dtflayout.com, builder.dtflayout.com, and at
            subdomains of dtflayout.com operated on behalf of our customers as part of our Quick Store product.
          </p>
          <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.75, margin: "0 0 8px" }}>
            By creating an account or using the Service, you agree to be bound by these Terms, together with our
            {" "}<Link to="/privacy-policy" style={{ color: P, fontWeight: 500, textDecoration: "none" }}>Privacy Policy</Link> and
            {" "}<Link to="/refund-policy" style={{ color: P, fontWeight: 500, textDecoration: "none" }}>Refund Policy</Link>.
            If you are using the Service on behalf of a business, you represent that you have the authority to bind that business to these Terms.
          </p>

          <Section id="acceptance" title="1. Acceptance of Terms">
            <p>By creating an account, accessing the Service, or uploading any content through our tools, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to any part of these Terms, you must not use the Service.</p>
            <p>We may update these Terms from time to time. Material changes will be communicated by email or through a notice in the Service. Your continued use after the effective date of an update means you accept the revised Terms.</p>
          </Section>

          <Section id="service" title="2. What the Service Does">
            <p>DTF Layout provides software tools for Direct-to-Film ("DTF") printing businesses. The Service currently includes:</p>
            <ul>
              <li><strong>Gang Sheet Builder</strong> — an in-browser tool for arranging images into print-ready DTF sheets.</li>
              <li><strong>Website Integration</strong> — a hosted, white-labelled builder that you link to from your own website so your customers can design their own sheets and submit them to your store for printing.</li>
              <li><strong>Quick Store</strong> — a branded, DTF Layout–hosted storefront at a subdomain of dtflayout.com where your customers can browse your products and place orders directly.</li>
            </ul>
            <p>We may add, modify, or remove features at any time. Beta or preview features — including any AI-assisted image tools — are provided on an "as-is" basis and may change or be withdrawn without notice.</p>
          </Section>

          <Section id="eligibility" title="3. Eligibility">
            <p>To use the Service, you must:</p>
            <ul>
              <li>Be at least 18 years old;</li>
              <li>Have the legal capacity to enter into a binding contract;</li>
              <li>Not be prohibited from using the Service under any applicable law; and</li>
              <li>Not be located in, or operating on behalf of an entity in, a sanctioned jurisdiction.</li>
            </ul>
            <p>The Service is built for businesses engaged in printing, design, or related commercial activity. It is not intended for personal consumer use.</p>
          </Section>

          <Section id="accounts" title="4. Accounts">
            <p>You are responsible for:</p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials;</li>
              <li>All activity that occurs under your account; and</li>
              <li>Promptly notifying us at <a href="mailto:support@dtflayout.com">support@dtflayout.com</a> if you suspect unauthorised access.</li>
            </ul>
            <p>You may register only <strong>one account per business entity</strong> for the purposes of claiming promotional credits (including the free trial). We reserve the right to consolidate or terminate duplicate accounts created to exploit promotional offers, and we may block sign-ups from disposable or temporary email addresses.</p>
            <p>We may suspend or terminate your account if we reasonably believe you have breached these Terms, misused the Service, or created legal risk for us or other users.</p>
          </Section>

          <Section id="credits" title="5. Credits, Fees, and Payment">
            <p>Access to paid features of the Service is purchased on a <strong>pre-paid credit basis</strong>. Credits are measured in square inches of generated print area and are consumed when you generate gang sheets or when orders are marked as paid in your Quick Store dashboard.</p>
            <ul>
              <li>Credits do not expire as long as your account remains active and in good standing.</li>
              <li>Credits are not transferable between accounts and have no cash value.</li>
              <li>Prices are listed on our <Link to="/pricing">Pricing page</Link> and may be updated from time to time. Price changes apply only to future purchases.</li>
              <li>Payments are processed by our third-party payment partner. We do not store full payment card details on our systems.</li>
              <li>Applicable taxes (including GST for Indian customers) are your responsibility and may be added at checkout.</li>
              <li>Promotional credits (for example, our 20,000 sq.in free trial) are limited to one per business, cannot be combined with other offers, and may be withdrawn if we detect abuse.</li>
            </ul>
            <p>Refunds are governed by our <Link to="/refund-policy">Refund Policy</Link>.</p>
          </Section>

          <Section id="acceptable-use" title="6. Acceptable Use">
            <p>You agree not to use the Service to upload, generate, transmit, or otherwise make available any content that:</p>
            <ul>
              <li>Infringes copyright, trademark, publicity, or any other intellectual property right of a third party;</li>
              <li>Constitutes child sexual abuse material, non-consensual intimate imagery, or otherwise sexualises minors;</li>
              <li>Promotes violence, terrorism, or hatred against any protected group;</li>
              <li>Contains malware, exploits, or code designed to harm our systems or other users; or</li>
              <li>Violates any applicable law in your jurisdiction or the jurisdiction of your customers.</li>
            </ul>
            <p>You also agree not to:</p>
            <ul>
              <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service;</li>
              <li>Use the Service to build a competing product or to train machine-learning models on our platform data;</li>
              <li>Resell, sublicense, or redistribute access to the Service itself (reselling the <em>print-ready output files</em> you generate for your own printing business is, of course, permitted — that is what the Service is for);</li>
              <li>Interfere with the operation of the Service, bypass rate limits, or exceed fair-use thresholds; or</li>
              <li>Use the Service for fraudulent, deceptive, or illegal activity.</li>
            </ul>
            <p>We may remove content, suspend access, or terminate accounts that violate this section, without prior notice in serious cases.</p>
          </Section>

          <Section id="content-ip" title="7. Your Content and Intellectual Property">
            <h3>Your content</h3>
            <p>You retain ownership of all images, designs, product data, logos, and other content you upload to the Service ("<strong>User Content</strong>"). You represent and warrant that you have the necessary rights to upload and use that content.</p>

            <h3>Licence to us</h3>
            <p>To operate the Service, you grant us a limited, worldwide, royalty-free licence to host, store, process, resize, generate derivative print-ready outputs from, and transmit your User Content — solely to the extent necessary to provide the Service to you. This licence ends when you delete the content or close your account, subject to the retention rules described in our Privacy Policy.</p>

            <h3>End-customer content</h3>
            <p>If you use Website Integration or Quick Store, your own customers will upload content to the Service through your branded builder or storefront. You are responsible for ensuring that your customers have the rights to upload that content, and <strong>you are the data controller</strong> (or equivalent) for your customer relationship. We process that content on your behalf as your service provider.</p>

            <h3>Our content</h3>
            <p>DTF Layout, the Gang Sheet Builder, Website Integration, Quick Store, our documentation, logos, and software are owned by Data Canvas Tech and protected by applicable intellectual property laws. These Terms do not grant you any rights to our marks or code beyond the limited right to use the Service.</p>
          </Section>

          <Section id="wi-qs" title="8. Website Integration and Quick Store">
            <h3>Website Integration</h3>
            <p>When you enable Website Integration, you embed or link to a hosted builder URL under <strong>builder.dtflayout.com</strong>. You remain responsible for your own website, checkout, order fulfilment, and customer communications. We are not a party to the transaction between you and your customer.</p>

            <h3>Quick Store</h3>
            <p>When you enable Quick Store, we host a storefront for you at a subdomain of dtflayout.com (<strong>{"{your-slug}"}.dtflayout.com</strong>). Quick Store does not process payments — you collect payment from your customers through channels of your choosing (for example, UPI, bank transfer, or in-person) and then mark orders as paid in your dashboard to release the print-ready file. You are the merchant of record for all orders placed through your Quick Store.</p>

            <h3>Your responsibilities for your customers</h3>
            <p>Whether via Website Integration or Quick Store, you are responsible for:</p>
            <ul>
              <li>Publishing your own terms of service, privacy policy, and refund policy for your customers;</li>
              <li>Complying with consumer-protection, tax, and data-protection laws that apply to your business;</li>
              <li>Handling your customers' orders, refunds, and disputes; and</li>
              <li>Fulfilling the prints (we do not print, ship, or handle physical goods in any form).</li>
            </ul>
            <p>We are a software provider, not a print service. Any dispute between you and your customer is between you and your customer.</p>
          </Section>

          <Section id="retention" title="9. File Retention and Deletion">
            <p>Print-ready files and order data are automatically scheduled for deletion from our storage after a short retention period, following the rules described in our Privacy Policy. <strong>You are responsible for downloading any files you wish to keep before they expire.</strong></p>
            <p>You may delete your account at any time by emailing <a href="mailto:support@dtflayout.com">support@dtflayout.com</a>. When you delete your account, we will delete or de-identify your personal data in line with our Privacy Policy, subject to data we are legally required to retain.</p>
          </Section>

          <Section id="availability" title="10. Service Availability">
            <p>The Service is provided on an <strong>"as-is"</strong> and <strong>"as-available"</strong> basis. We do not offer a formal uptime guarantee or service-level agreement at this time. We will use reasonable efforts to keep the Service available and secure, but we cannot guarantee that it will be uninterrupted, error-free, or free from security vulnerabilities.</p>
            <p>We may perform scheduled or emergency maintenance, introduce or remove features, and make changes to the Service at our discretion.</p>
          </Section>

          <Section id="third-party" title="11. Third-Party Services">
            <p>The Service relies on and may integrate with third-party services — for example, Shopify or WooCommerce for your own store, and the payment, email, analytics, and infrastructure providers listed in our Privacy Policy. Your use of those third-party services is governed by their respective terms. We are not responsible for the availability, security, or practices of third-party services.</p>
          </Section>

          <Section id="disclaimers" title="12. Disclaimers">
            <p>To the maximum extent permitted by law, we disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, and warranties arising from course of dealing or trade usage.</p>
            <p>We do not warrant that:</p>
            <ul>
              <li>The Service will meet your specific requirements;</li>
              <li>Output files will be suitable for every printer, RIP software, or film type;</li>
              <li>Colours rendered on screen will match printed output — colour management is the printer's responsibility; or</li>
              <li>The Service will be free from errors, bugs, or interruptions.</li>
            </ul>
            <p>Print quality depends on many factors outside our control, including the quality of your source images, your printer hardware, RIP settings, film, ink, heat press, and operator skill. <strong>We are not liable for print errors caused by low-resolution uploads, incorrect size selection, wrong DPI choice, or issues with third-party printing equipment.</strong></p>
          </Section>

          <Section id="liability" title="13. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, Data Canvas Tech will not be liable to you for any <strong>indirect, incidental, special, consequential, or exemplary damages</strong>, including loss of profits, loss of goodwill, loss of data, business interruption, or the cost of substitute services, whether arising under contract, tort, or any other legal theory, and whether or not we have been advised of the possibility of such damages.</p>
            <p>Our <strong>total aggregate liability</strong> to you for all claims arising out of or relating to these Terms or the Service is limited to the amount you paid to us for the Service during the twelve (12) months preceding the event giving rise to the claim, or ₹1,000 (whichever is greater).</p>
          </Section>

          <Section id="indemnity" title="14. Indemnification">
            <p>You agree to indemnify and hold harmless Data Canvas Tech, its officers, employees, and agents from any claim, loss, or demand (including reasonable legal fees) arising out of your use of the Service, your User Content (including content uploaded by your customers), or your breach of these Terms.</p>
          </Section>

          <Section id="termination" title="15. Suspension and Termination">
            <p>We may suspend or terminate your access to the Service, without prior notice, if:</p>
            <ul>
              <li>You breach these Terms or our Acceptable Use policy;</li>
              <li>Your account is used for illegal, fraudulent, or harmful activity;</li>
              <li>We are required to do so by law or by a valid legal order; or</li>
              <li>A payment or chargeback dispute remains unresolved for more than 30 days.</li>
            </ul>
            <p>You may terminate your account at any time by emailing <a href="mailto:support@dtflayout.com">support@dtflayout.com</a>. Sections that by their nature should survive termination — including Intellectual Property, Limitation of Liability, Indemnification, Governing Law, and any unpaid fees — will survive.</p>
          </Section>

          <Section id="changes" title="16. Changes to These Terms">
            <p>We may update these Terms from time to time. If we make material changes, we will notify you by email or through a notice in the Service. Your continued use of the Service after the effective date of the updated Terms means you accept the changes. If you do not agree, your only remedy is to stop using the Service and close your account.</p>
          </Section>

          <Section id="law" title="17. Governing Law and Dispute Resolution">
            <p>These Terms are governed by and construed in accordance with the laws of <strong>India</strong>, without regard to its conflict-of-laws principles. The courts of <strong>Mumbai, Maharashtra</strong> have exclusive jurisdiction over any dispute arising out of or relating to these Terms or the Service, except that we reserve the right to seek injunctive relief in any competent jurisdiction to protect our intellectual property.</p>
            <p>Before filing any formal dispute, you agree to contact us at <a href="mailto:support@dtflayout.com">support@dtflayout.com</a> and attempt to resolve the matter informally and in good faith.</p>
          </Section>

          <Section id="general" title="18. General">
            <h3>Entire agreement</h3>
            <p>These Terms, together with our Privacy Policy and Refund Policy, constitute the entire agreement between you and Data Canvas Tech regarding the Service.</p>

            <h3>Severability</h3>
            <p>If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</p>

            <h3>No waiver</h3>
            <p>Our failure to enforce any provision of these Terms is not a waiver of that provision or of any other right.</p>

            <h3>Assignment</h3>
            <p>You may not assign these Terms without our prior written consent. We may assign these Terms to a successor in connection with a merger, acquisition, or sale of substantially all of our assets.</p>
          </Section>

          <Section id="contact" title="19. Contact">
            <p>Questions about these Terms? Email us at <a href="mailto:support@dtflayout.com">support@dtflayout.com</a>.</p>
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
