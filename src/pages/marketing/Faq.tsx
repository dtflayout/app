import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

/* ══════════ DESIGN TOKENS ══════════ */
const HF = "'Bricolage Grotesque', sans-serif";
const BF = "'Inter', sans-serif";
const P = "#4F46E5";

/* ══════════ SHARED COMPONENTS ══════════ */
function Sq({ top, left, right, bottom, size = 28, rotate = 12 }: any) { const p: any = {}; if (top != null) p.top = top; if (left != null) p.left = left; if (right != null) p.right = right; if (bottom != null) p.bottom = bottom; return <div style={{ position: "absolute", width: size, height: size, borderRadius: size * 0.25, border: "1.5px dashed rgba(79,70,229,0.1)", transform: `rotate(${rotate}deg)`, pointerEvents: "none", ...p }} />; }
function Dots({ o = 0.2 }: { o?: number }) { return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: o, backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />; }
function Pill({ children }: any) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, fontFamily: BF, background: "#EEF2FF", color: P, border: "1px solid #C7D2FE" }}>{children}</span>; }
function Btn({ children, v = "p", sz = "m", style: sx, onClick }: any) { const pad: any = { s: "10px 24px", m: "14px 34px", l: "17px 42px" }[sz]; const fs: any = { s: 14, m: 15, l: 16 }[sz]; const vars: any = { p: { background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", border: "none", boxShadow: "0 6px 28px rgba(79,70,229,0.28)" }, o: { background: "#fff", color: "#111827", border: "1.5px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" } }; return <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: BF, fontWeight: 600, cursor: "pointer", borderRadius: 99, transition: "all 0.25s", padding: pad, fontSize: fs, ...vars[v], ...sx }}>{children}</button>; }
const ic = { chev: <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> };
function MovingPattern() { return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}><div className="orb orb-1" style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)", top: "-15%", left: "-10%", filter: "blur(40px)" }} /><div className="orb orb-2" style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)", top: "15%", right: "-12%", filter: "blur(30px)" }} /><div className="orb orb-3" style={{ position: "absolute", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(165,180,252,0.35) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)", bottom: "5%", left: "25%", filter: "blur(35px)" }} /><div className="grid-drift" style={{ position: "absolute", inset: "-50%", width: "200%", height: "200%", opacity: 0.18, backgroundImage: "linear-gradient(rgba(165,180,252,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(165,180,252,0.3) 1px, transparent 1px)", backgroundSize: "80px 80px" }} /></div>; }

const ANIM_CSS = `
@keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(60px,40px) scale(1.1)}50%{transform:translate(20px,80px) scale(0.95)}75%{transform:translate(-40px,30px) scale(1.05)}}
@keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-50px,60px) scale(1.08)}50%{transform:translate(-80px,20px) scale(0.92)}75%{transform:translate(-20px,-40px) scale(1.03)}}
@keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(70px,-30px) scale(1.12)}66%{transform:translate(-30px,-60px) scale(0.9)}}
@keyframes gridDrift{0%{transform:translate(0,0)}100%{transform:translate(60px,60px)}}
.orb-1{animation:orbFloat1 8s ease-in-out infinite}.orb-2{animation:orbFloat2 10s ease-in-out infinite}.orb-3{animation:orbFloat3 7s ease-in-out infinite}.grid-drift{animation:gridDrift 8s linear infinite}
.faq-item{transition:all 0.3s ease}.faq-item:hover{border-color:#C7D2FE!important;box-shadow:0 4px 16px rgba(79,70,229,0.06)!important}
.nav-item{transition:all 0.2s ease;cursor:pointer;position:relative}.nav-item:hover{background:rgba(79,70,229,0.04)!important}
.nav-item.active::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0}
.ql-card{transition:all 0.3s ease}.ql-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(79,70,229,0.12)!important;border-color:#C7D2FE!important}
`;

/* ══════════ CATEGORY META ══════════ */
const catMeta: Record<string, { icon: React.ReactNode; tint: string; accent: string }> = {
  general: { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>, tint: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", accent: "#4F46E5" },
  builder: { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>, tint: "linear-gradient(135deg, #EDE9FE, #DDD6FE)", accent: "#7C3AED" },
  "website-integration": { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" /></svg>, tint: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", accent: "#059669" },
  "quick-store": { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, tint: "linear-gradient(135deg, #FFF7ED, #FED7AA)", accent: "#D97706" },
  pricing: { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>, tint: "linear-gradient(135deg, #F0F9FF, #BAE6FD)", accent: "#0284C7" },
  switching: { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>, tint: "linear-gradient(135deg, #FDF2F8, #FCE7F3)", accent: "#DB2777" },
  technical: { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>, tint: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", accent: "#6D28D9" },
  support: { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>, tint: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", accent: "#10B981" },
};

/* ══════════ FAQ DATA ══════════ */
interface FaqItem { q: string; a: string | React.ReactNode; }
interface FaqSection { id: string; title: string; subtitle: string; items: FaqItem[]; }

const faqSections: FaqSection[] = [
  {
    id: "general", title: "General", subtitle: "About DTF Layout",
    items: [
      { q: "What is DTF Layout?", a: "DTF Layout is an all-in-one platform built specifically for Direct-to-Film (DTF) printing businesses. It combines intelligent gang sheet layout generation with powerful image editing tools — background remover, auto trimmer, image enhancer, stroke/outline generator, eraser, and a text editor. Everything you need to prepare, edit, and arrange designs for printing, all in one place. No Photoshop, no Canva, no switching between apps." },
      { q: "Who is DTF Layout built for?", a: (<div><p style={{ marginBottom: 12 }}>DTF Layout serves the entire DTF printing ecosystem:</p><ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}><li><strong>DTF print shops</strong> — Use the builder yourself or let your customers build their own gang sheets via Website Integration or Quick Store</li><li><strong>Custom apparel brands</strong> — Create optimized layouts for your print orders without design skills</li><li><strong>Print-on-demand businesses</strong> — Automate gang sheet creation at scale</li><li><strong>Designers & freelancers</strong> — Prepare print-ready gang sheets with professional editing tools</li></ul></div>) },
      { q: "What's the difference between the Gang Sheet Builder, Website Integration, and Quick Store?", a: (<div><p style={{ marginBottom: 12 }}>These are three different ways to use DTF Layout, all included in every plan:</p><ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}><li><strong>Gang Sheet Builder</strong> — The core tool. You (the printer) log in, upload images, edit them, and generate optimized gang sheets for your own use.</li><li><strong>Website Integration</strong> — Embed a fully white-labeled gang sheet builder on your existing Shopify store or website. Your customers create their own sheets, pick a variant, and check out through your Shopify store. You receive the order + print-ready file.</li><li><strong>Quick Store</strong> — A complete standalone storefront hosted by DTF Layout (yourname.dtflayout.com). No website needed. Your customers browse products, create gang sheets, and place orders directly — all under your brand.</li></ul></div>) },
      { q: "Do I need any design skills to use DTF Layout?", a: "Not at all. DTF Layout is designed for printers, not designers. Upload your images, and the builder handles the arrangement automatically. The editing tools have intuitive interfaces — click a color to remove a background, drag a slider to enhance an image. If your customers can drag and drop a file, they can use your builder." },
      { q: "Is DTF Layout available worldwide?", a: "Yes. DTF Layout works globally with pricing in both INR and USD. We automatically detect your region and show the appropriate pricing. Payments are processed securely via Dodo Payments, which supports credit/debit cards worldwide, plus UPI and net banking for Indian customers." },
    ],
  },
  {
    id: "builder", title: "Gang Sheet Builder", subtitle: "Tools & features",
    items: [
      { q: "How does the layout generator work?", a: "Upload your images (up to 80 per session), select your film width (23\" or 11\" — or custom widths for Website Integration), and DTF Layout's algorithm automatically arranges them for maximum space efficiency. You can drag, resize, rotate, and duplicate images on the canvas. When you're happy with the arrangement, generate the layout and download a print-ready PNG file with embedded DPI metadata." },
      { q: "What image editing tools are included?", a: (<div><p style={{ marginBottom: 12 }}>Every plan includes the full editing toolkit:</p><ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}><li><strong>Background Remover</strong> — Select any color (or multiple colors) to remove, with per-color tolerance sliders</li><li><strong>Auto Detect Image Trimmer</strong> — Automatically trims empty space around your artwork</li><li><strong>Image Enhancer</strong> — Adjust brightness, contrast, vibrance, saturation, and hue</li><li><strong>Stroke/Outline Tool</strong> — Add outlines to designs for easier peeling and cleaner prints</li><li><strong>Eraser Tool</strong> — Remove unwanted parts of any image</li><li><strong>Text Editor</strong> — Add custom text with 40+ Google Fonts, adjustable colors, sizes, and styles</li></ul></div>) },
      { q: "What DPI options are available?", a: "DTF Layout supports both 150 DPI and 300 DPI exports. At 150 DPI, you can generate sheets up to 400 inches long. At 300 DPI, the maximum is 200 inches. The DPI metadata is embedded directly in the exported PNG file, so your RIP software reads it correctly without any manual configuration." },
      { q: "What film widths does DTF Layout support?", a: "The core builder supports 23-inch (standard wide format) and 11-inch (compact format). For Website Integration, you can configure any custom sheet width — 10.5\", 11\", 11.5\", 22\", 22.5\", 23\", or whatever your printer uses. The width is fixed per product, and your customers only control what goes on the sheet." },
      { q: "Can I upload multiple images at once?", a: "Yes. You can upload up to 80 images per session via drag-and-drop or file picker. For best performance on devices with limited memory, we recommend batches of 60 or fewer. There's no limit on how many gang sheets you can create overall." },
      { q: "What file formats are supported?", a: "DTF Layout supports PNG and JPG uploads — the standard formats used in DTF printing. Exported gang sheets are always high-quality PNG files with embedded DPI metadata, ready for direct import into your RIP software." },
      { q: "Can I create multiple gang sheets in one session?", a: "Yes. DTF Layout supports multi-sheet creation — if your images don't fit on a single sheet, the builder can distribute them across multiple sheets automatically. You can also manually manage sheets using the sheet tabs at the bottom of the canvas." },
      { q: "Does DTF Layout save my designs? Is there session recovery?", a: "Your designs are processed locally and are not stored on our servers for privacy. However, DTF Layout includes session recovery — if you accidentally close your browser or lose connection, your work-in-progress is saved locally and can be restored when you return." },
    ],
  },
  {
    id: "website-integration", title: "Website Integration", subtitle: "Embed on your site",
    items: [
      { q: "What exactly is Website Integration?", a: "Website Integration lets you embed a fully white-labeled gang sheet builder directly on your own website. Your customers visit your site, create their own gang sheets using your branded builder, and check out via your Shopify store — all without ever seeing the DTF Layout brand. You get a unique URL (builder.dtflayout.com/yourstore/product-slug) that you can embed via iframe or link directly." },
      { q: "How do I set it up?", a: (<div><p style={{ marginBottom: 12 }}>It takes about 5 minutes, no coding required:</p><ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}><li>Create your store in DTF Layout — pick a name, upload your logo, set your store slug</li><li>Add a product by pasting your Shopify product URL — we auto-fetch your variants and prices</li><li>Customize the appearance — colors, fonts, button styles, logo, favicon</li><li>Copy the generated builder URL and embed it on your Shopify page (or any website) via iframe or direct link</li></ol></div>) },
      { q: "What can I customize in the white-label builder?", a: (<div><p style={{ marginBottom: 12 }}>Everything visual is customizable to match your brand:</p><ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}><li><strong>8 independent color zones</strong> — Background, Top Bar, Action Bar, Primary, Text, Toolbox Icons, Image Card, and more</li><li><strong>50+ Google Fonts</strong> — Choose from a curated library or type any Google Font name</li><li><strong>3 button styles</strong> — Pill, Rounded, or Square</li><li><strong>Custom logo</strong> — Appears in the top bar and as the loading spinner</li><li><strong>Custom favicon</strong> — Auto-injected for branded browser tabs</li><li><strong>Tool toggles</strong> — Enable/disable specific editing tools for your customers</li></ul><p style={{ marginTop: 12 }}>Changes are visible in a live preview as you make them.</p></div>) },
      { q: "How does Shopify integration work?", a: "You paste your Shopify product URL, and DTF Layout auto-fetches all variants (e.g., 22×20, 22×30, 22×40) with their prices. When a customer generates a gang sheet, we auto-match the closest variant based on the sheet height and redirect them to your Shopify cart with the correct variant pre-selected. The customer pays through your normal Shopify checkout — you keep 100% of the payment." },
      { q: "Do my customers need to create an account?", a: "No. The public builder requires zero authentication. Your customers can start creating gang sheets immediately — no sign-up, no login, no friction. They just upload images, build their sheet, and proceed to checkout." },
      { q: "How do I receive and manage orders?", a: "All orders appear in your Website Integration dashboard with a Kanban board (Pending → Paid → Downloaded) or table view. You can filter by date range, search by design code, see stats at a glance, and download the actual print-ready PNG files your customers created. Credits are deducted when you mark an order as paid." },
      { q: "Can I use Website Integration on a non-Shopify site?", a: "Yes. The builder URL works anywhere — embed it via iframe on any website (WordPress, Wix, Squarespace, custom-built sites) or share it as a direct link. Shopify integration is for automated variant matching and cart redirect, but the builder itself is platform-agnostic." },
      { q: "Is the builder mobile-friendly?", a: "Yes. The public builder is fully responsive and works on phones and tablets. Desktop provides the best experience for detailed editing, but customers can upload images and generate sheets on any device." },
    ],
  },
  {
    id: "quick-store", title: "Quick Store", subtitle: "Your own storefront",
    items: [
      { q: "What is Quick Store?", a: "Quick Store is a complete standalone storefront hosted by DTF Layout at yourname.dtflayout.com. If you don't have a website or don't want to deal with Shopify, Quick Store gives you a fully branded online store where customers can browse your products, create gang sheets, and place orders — all without you writing a single line of code." },
      { q: "How is Quick Store different from Website Integration?", a: (<div><ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}><li><strong>Website Integration</strong> — You embed the gang sheet builder on your existing website. Checkout happens through your Shopify store. Best for printers who already have a Shopify site.</li><li><strong>Quick Store</strong> — A full standalone storefront hosted by us. Customers browse products, create gang sheets, and submit orders — all on your Quick Store URL. Best for printers who don't have a website or want a dedicated ordering page.</li></ul></div>) },
      { q: "What features does Quick Store include?", a: (<div><ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}><li>Customizable homepage with multiple hero styles and product sections</li><li>Product catalog with variants and pricing</li><li>Built-in gang sheet builder for customer self-service</li><li>Order management dashboard with Kanban and table views</li><li>Customer directory and contact messages inbox</li><li>Business hours and delivery timeline editor</li><li>FAQ section for your storefront</li><li>Multiple footer styles and full brand customization</li></ul></div>) },
      { q: "How do customers pay on Quick Store?", a: "Quick Store currently operates as an order collection system. Customers create their gang sheets and submit orders through your store, and you handle payment offline — via bank transfer, UPI, cash, or whatever method works best for your business. This gives you full flexibility in how you handle payments with your customers." },
      { q: "Can I manage orders and customers?", a: "Yes. Quick Store includes a full order management system with Kanban (drag-and-drop) and table views, status tracking (Pending → Paid → Downloaded), bulk actions, date range filters, and stats cards. You also get a customer directory and a messages inbox where customers can contact you directly through your store." },
      { q: "Do Quick Store orders expire?", a: "Yes. Unclaimed orders automatically expire after 10 days to keep your dashboard clean. You can also manually clear expired orders with a single click. This ensures you're only working with active, relevant orders." },
    ],
  },
  {
    id: "pricing", title: "Pricing & Credits", subtitle: "Plans & billing",
    items: [
      { q: "How does pricing work?", a: "DTF Layout uses a simple credit-based model — no subscriptions, no monthly fees, no per-order commissions. You buy credits once (measured in square inches), and they're deducted each time you generate a gang sheet. When credits run low, just recharge with any plan. Your existing credits carry over — new credits are added to your balance." },
      { q: "What plans are available?", a: (<div><ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}><li><strong>DTF Trial</strong> — Free · 20,000 sq.in · No credit card required</li><li><strong>DTF Starter</strong> — ₹1,999 / $49 · 1,50,000 sq.in</li><li><strong>DTF Growth</strong> — ₹5,999 / $149 · 5,00,000 sq.in</li><li><strong>DTF Max</strong> — ₹11,999 / $299 · 20,00,000 sq.in · Lowest per-inch rate</li></ul><p style={{ marginTop: 12 }}>All plans include full access to every tool — the Gang Sheet Builder, all editing tools, Website Integration, Quick Store, white-label builder, and analytics.</p></div>) },
      { q: "Do credits expire?", a: "No. Your credits never expire. Use them at your own pace — there's no time limit, no monthly reset, and no pressure to use them before a deadline." },
      { q: "Are there any monthly fees, subscriptions, or per-order charges?", a: "None. Zero. DTF Layout uses a pure pay-once-use-anytime model. There are no monthly subscriptions, no per-order commissions, no revenue sharing, and no hidden fees. You buy credits, you use them. That's it." },
      { q: "How is credit usage calculated?", a: "Credits are deducted based on the total area of your output gang sheet (width × height in square inches). For example, a 23\" × 40\" sheet uses 920 square inches of credits. The editing tools (background remover, enhancer, trimmer, etc.) are completely free — credits are only used when you generate a layout." },
      { q: "What payment methods do you accept?", a: "All payments are processed securely via Dodo Payments. For Indian customers: credit/debit cards, UPI, and net banking. For international customers: credit and debit cards. All transactions are encrypted and secure." },
      { q: "Can I upgrade to a bigger plan?", a: "Since there are no subscriptions, there's nothing to \"upgrade.\" Simply purchase additional credits anytime — your existing balance carries over and new credits are added on top. Many users start with Starter and move to Max once they see the per-inch savings." },
      { q: "Do you offer refunds?", a: "Yes. We offer refunds within 7 days of purchase for unused credits. Please refer to our refund policy or contact us at support@dtflayout.com for details." },
      { q: "Is there a free trial?", a: "Yes! Every new account gets 20,000 sq.inches of free credits — no credit card required. That's enough to create several gang sheets and fully experience the platform, including Website Integration and Quick Store, before purchasing." },
    ],
  },
  {
    id: "switching", title: "Switching to DTF Layout", subtitle: "Migration & comparison",
    items: [
      { q: "I'm currently using a commission-based gang sheet tool. Why should I switch?", a: "Commission-based tools typically take 3–5% of every order your customers place. That means the more successful your business gets, the more you pay — and over time, those costs compound significantly. DTF Layout charges zero commission. You buy credits upfront at a fixed rate, and the cost per gang sheet stays the same whether you process 10 orders a month or 10,000. Your growth is your profit, not someone else's." },
      { q: "I'm on a subscription-based platform with tiered monthly pricing. How does DTF Layout compare?", a: "Subscription platforms lock you into monthly payments regardless of how much you use the tool. If you have a slow month, you still pay. If you exceed your tier, you pay more. DTF Layout has no monthly fees at all. You buy credits when you need them, and they never expire. During slow months, you pay nothing. During busy months, you use what you already have. It's the most flexible model for seasonal and growing businesses." },
      { q: "Will I save money by switching?", a: (<div><p style={{ marginBottom: 12 }}>In almost every scenario, yes — especially at scale. Here's a quick comparison for a printer processing 200 gang sheets per month:</p><ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}><li><strong>Commission-based tools (5% per order)</strong> — If your average order is $15, you're paying $150/month in commission. That's $1,800/year.</li><li><strong>Subscription-based tools</strong> — Mid-tier plans typically run $149–$399/month. That's $1,788–$4,788/year.</li><li><strong>DTF Layout (Max plan)</strong> — $299 one-time for 2 million sq.inches. For most printers, that covers months of production with zero recurring cost.</li></ul><p style={{ marginTop: 12 }}>Visit our <Link to="/pricing" style={{ color: P, fontWeight: 600, textDecoration: "none" }}>Pricing page</Link> to use the interactive savings calculator with your own numbers.</p></div>) },
      { q: "Can I use DTF Layout if I don't have a Shopify store?", a: "Yes. While Website Integration's variant matching feature is designed for Shopify, you can use the builder URL on any website via iframe or direct link. And Quick Store gives you a complete standalone storefront without needing any external platform at all — no Shopify, no WooCommerce, no website required." },
      { q: "I'm on Shopify. How hard is it to switch?", a: "Very easy. You don't need to uninstall anything or migrate data. Just create your store in DTF Layout, paste your Shopify product URL (we auto-fetch variants), customize the look, and embed the builder on your Shopify page. Your existing products, variants, and checkout flow stay exactly the same — DTF Layout simply provides the gang sheet builder that connects to your Shopify cart." },
      { q: "Do you lock me into a contract or annual commitment?", a: "No. There are no contracts, no annual commitments, and no lock-in of any kind. You buy credits when you want, use them at your own pace, and if you ever want to stop, there's nothing to cancel. Your credits just sit there until you need them again." },
      { q: "What does DTF Layout offer that other gang sheet tools don't?", a: (<div><ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}><li><strong>Zero commission, zero subscription</strong> — Pure credit-based pricing. You keep 100% of your revenue.</li><li><strong>Built-in image editing suite</strong> — Background remover, trimmer, enhancer, stroke tool, eraser, text editor. No need for Photoshop.</li><li><strong>Full white-labeling</strong> — 8 color zones, 50+ fonts, custom logo/favicon, button styles. Your customers never see our brand.</li><li><strong>Quick Store</strong> — A complete standalone storefront for printers who don't have a website.</li><li><strong>Global + India pricing</strong> — INR and USD pricing with region detection, plus UPI/net banking support for Indian printers.</li><li><strong>Credits never expire</strong> — No monthly reset, no pressure to use them before a deadline.</li></ul></div>) },
      { q: "My customers are used to the existing tool. Will they find DTF Layout hard to use?", a: "No. The customer-facing builder is designed to be simpler and more intuitive than most alternatives. Upload images, drag to arrange, click to generate — that's the core flow. Plus, since you fully white-label the builder, your customers will see your brand and won't know you switched tools. The transition is invisible to them." },
    ],
  },
  {
    id: "technical", title: "Technical", subtitle: "Setup & requirements",
    items: [
      { q: "Do I need to install any software?", a: "No. DTF Layout is entirely web-based. No downloads, no plugins, no installations. Just open your browser, log in, and start building. Works on Chrome, Firefox, Safari, and Edge." },
      { q: "Can I use DTF Layout on mobile devices?", a: "Yes. DTF Layout is responsive and works on phones and tablets. The gang sheet builder and public-facing builder are both mobile-friendly. That said, desktop or laptop provides the best experience for detailed editing work — especially when working with many images." },
      { q: "Is my data secure?", a: "Yes. DTF Layout does not permanently store your design files on our servers. Images are processed in your browser and uploaded temporarily only during layout generation. All authentication is handled via Supabase Auth with industry-standard encryption, and payments are processed through Dodo Payments' secure infrastructure." },
      { q: "What happens if I close my browser by accident?", a: "DTF Layout includes session recovery. Your work-in-progress layout is saved locally in your browser. If you accidentally close the tab or lose connection, you'll be prompted to restore your session when you return." },
      { q: "Can my RIP software read the exported files?", a: "Yes. DTF Layout exports high-quality PNG files with DPI metadata embedded directly in the file header (150 DPI or 300 DPI). Most RIP software reads this automatically. The output is designed for direct import — no manual DPI configuration needed." },
      { q: "Is there a limit on how many gang sheets I can create?", a: "No. There's no limit on the number of gang sheets you generate. You can create as many as your credits allow. The only per-session limit is 80 images per upload batch, which is a performance guardrail — you can start a new session immediately after." },
      { q: "What are the maximum sheet dimensions?", a: "At 150 DPI: up to 400 inches long. At 300 DPI: up to 200 inches long. Width is fixed based on your film width (23\", 11\", or custom widths in Website Integration). These are the largest dimensions supported by any browser-based gang sheet builder." },
      { q: "Does DTF Layout work in India despite Supabase being blocked?", a: "Yes. We've implemented a Cloudflare proxy workaround that routes all database connections through a custom domain. Indian users experience zero issues — the platform works seamlessly regardless of ISP restrictions." },
    ],
  },
  {
    id: "support", title: "Support", subtitle: "Help & contact",
    items: [
      { q: "How do I get help?", a: (<div><p style={{ marginBottom: 12 }}>We're reachable and responsive:</p><ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}><li><strong>Email</strong> — <a href="mailto:support@dtflayout.com" style={{ color: P, fontWeight: 600, textDecoration: "none" }}>support@dtflayout.com</a> for any questions, bugs, or feature requests</li><li><strong>Contact page</strong> — <Link to="/contact" style={{ color: P, fontWeight: 600, textDecoration: "none" }}>dtflayout.com/contact</Link> with a quick form</li></ul><p style={{ marginTop: 12 }}>We aim to respond to every message within 24 hours, often much faster.</p></div>) },
      { q: "What if I find a bug or have a feature request?", a: "Email us at support@dtflayout.com with a description and, if possible, a screenshot. We actively develop DTF Layout and prioritize fixes and features based on user feedback. Many of our best features — like multi-sheet support, the text editor, and session recovery — came directly from user requests." },
      { q: "Do you offer onboarding or setup help?", a: "Yes. If you need help setting up Website Integration, configuring your Quick Store, or understanding the platform, just reach out. We'll walk you through the process — whether that's via email, a quick call, or a screen share. We want you to be fully operational, not stuck on setup." },
      { q: "Will I get an invoice for my purchase?", a: "Yes. Invoices are automatically generated for all credit purchases and are available in your billing page." },
      { q: "How do I create an account?", a: (<div><p>Visit <Link to="/signup" style={{ color: P, fontWeight: 600, textDecoration: "none" }}>dtflayout.com/signup</Link> and create a free account with your email. You'll get 20,000 sq.inches of free credits immediately — no credit card needed. You can start building gang sheets, setting up Website Integration, or configuring your Quick Store right away.</p></div>) },
      { q: "I have a question that's not listed here. What should I do?", a: "Email us at support@dtflayout.com — we respond to every message. No question is too small, and we're happy to hop on a quick call if needed. If your question would help other users too, we'll add it to this FAQ." },
    ],
  },
];

/* ══════════ COMPONENT ══════════ */
export default function Faq() {
  const navigate = useNavigate();
  const [dd, setDd] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load fonts + animations
  useEffect(() => { const l1 = document.createElement("link"); l1.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"; l1.rel = "stylesheet"; document.head.appendChild(l1); return () => { document.head.removeChild(l1); }; }, []);
  useEffect(() => { if (!document.querySelector("style[data-dtf-faq]")) { const tag = document.createElement("style"); tag.setAttribute("data-dtf-faq", "1"); tag.textContent = ANIM_CSS; document.head.appendChild(tag); } return () => { const tag = document.querySelector("style[data-dtf-faq]"); if (tag) tag.remove(); }; }, []);

  // Reset category on search
  useEffect(() => { if (searchQuery.trim()) setActiveCategory("all"); }, [searchQuery]);

  const totalQuestions = faqSections.reduce((acc, s) => acc + s.items.length, 0);

  const filteredSections = useMemo(() => {
    let sections = faqSections;
    if (activeCategory !== "all") sections = sections.filter(s => s.id === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sections = sections.map(s => ({ ...s, items: s.items.filter(item => item.q.toLowerCase().includes(q) || (typeof item.a === "string" && item.a.toLowerCase().includes(q))) })).filter(s => s.items.length > 0);
    }
    return sections;
  }, [activeCategory, searchQuery]);

  const scrollToSection = (id: string) => { setActiveCategory(id); setOpenFaq(null); setTimeout(() => { const el = sectionRefs.current[id]; if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100); };

  return (
    <div style={{ fontFamily: BF, color: "#111827", overflowX: "hidden" }}>

      {/* ═══ NAV ═══ */}
      <div style={{ position: "fixed", top: 16, left: 0, right: 0, zIndex: 100, padding: "0 32px" }}>
        <nav style={{ maxWidth: 960, margin: "0 auto", background: "linear-gradient(135deg, #1E1B4B, #252272, #1E1B4B)", borderRadius: 16, padding: "0 8px 0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid rgba(99, 102, 241, 0.2)", boxShadow: "0 8px 32px rgba(15,13,46,0.5), 0 2px 8px rgba(0,0,0,0.2)" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div>
            <span style={{ fontFamily: HF, fontWeight: 700, fontSize: 16, color: "#fff" }}>DTF Layout</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link to="/" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", padding: "8px 14px", textDecoration: "none" }}>Home</Link>
            <div style={{ position: "relative" }} onMouseEnter={() => setDd(true)} onMouseLeave={() => setDd(false)}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 10, background: dd ? "rgba(255,255,255,0.08)" : "transparent" }}>Product {ic.chev}</span>
              {dd && <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 260, paddingTop: 10 }}><div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", boxShadow: "0 20px 56px rgba(0,0,0,0.15)", padding: 5 }}>{[{ l: "Gang Sheet Builder", d: "Auto-layout optimized gang sheets", to: "/product/gang-sheet-builder" }, { l: "Website Integration", d: "Embed builder on any website", to: "/product/website-integration" }, { l: "Quick Store", d: "Full storefront, zero coding", to: "/product/quick-store" }].map((it, i) => <Link key={i} to={it.to} style={{ padding: "10px 12px", borderRadius: 10, display: "block", textDecoration: "none" }} onMouseEnter={(e: any) => e.currentTarget.style.background = "#EEF2FF"} onMouseLeave={(e: any) => e.currentTarget.style.background = "transparent"}><div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{it.l}</div><div style={{ fontSize: 10, color: "#6B7280" }}>{it.d}</div></Link>)}</div></div>}
            </div>
            {[{ l: "Pricing", to: "/pricing" }, { l: "FAQ", to: "/faq" }, { l: "Contact", to: "/contact" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, fontWeight: 500, color: item.l === "FAQ" ? "#fff" : "rgba(255,255,255,0.7)", padding: "8px 14px", textDecoration: "none" }}>{item.l}</Link>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", padding: "8px 14px", textDecoration: "none" }}>Login</Link>
            <button onClick={() => navigate("/signup")} style={{ fontFamily: BF, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(79,70,229,0.4)" }}>Register →</button>
          </div>
        </nav>
      </div>

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #050412 0%, #08061A 5%, #0A0820 10%, #0D0B26 14%, #0F0D2E 19%, #141138 24%, #1A1744 29%, #1E1B4B 34%, #272368 39%, #312E81 44%, #4F46E5 54%, #6366F1 61%, #818CF8 68%, #A5B4FC 75%, #C7D2FE 82%, #E0E7FF 88%, #F5F5F7 94%, #FAFAFB 100%)", padding: "0 40px 0" }}>
        <Dots o={0.04} /><MovingPattern />
        <div style={{ padding: "140px 0 0" }}>
          <Sq top={20} right={140} size={32} rotate={18} /><Sq top={100} right={80} size={22} rotate={-12} /><Sq top={30} left={100} size={28} rotate={22} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <Pill><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> {totalQuestions} Questions Answered</Pill>
            <h1 style={{ fontFamily: HF, fontSize: 60, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "28px 0 20px" }}>Frequently Asked<br />Questions</h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 540, margin: "0 auto 36px" }}>Everything you need to know about DTF Layout — from getting started to switching from other tools.</p>

            {/* Search Bar */}
            <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text" placeholder="Search for answers..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "16px 48px 16px 50px", borderRadius: 16, border: "none", fontSize: 16, fontWeight: 500, fontFamily: BF, color: "#111827", background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", outline: "none", boxSizing: "border-box" }}
              />
              {searchQuery && <div onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></div>}
            </div>
          </div>
          <div style={{ height: 120, background: "linear-gradient(180deg, transparent, #FAFAFB)" }} />
        </div>
      </section>

      {/* ═══ SIDEBAR + FAQ CONTENT ═══ */}
      <section style={{ padding: "0 40px 120px", position: "relative", marginTop: -40 }}>
        <Dots o={0.03} />
        <div style={{ maxWidth: 1340, margin: "0 auto", position: "relative", zIndex: 10, display: "flex", gap: 36, alignItems: "flex-start" }}>

          {/* LEFT SIDEBAR — sticky nav */}
          <div style={{ width: 290, flexShrink: 0, position: "sticky", top: 100 }}>
            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E5E7EB", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", overflow: "hidden" }}>
              {/* All */}
              <div className={`nav-item${activeCategory === "all" ? " active" : ""}`} onClick={() => { setActiveCategory("all"); setSearchQuery(""); setOpenFaq(null); }} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, background: activeCategory === "all" ? "linear-gradient(135deg,#4F46E5,#7C3AED)" : "transparent", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: activeCategory === "all" ? "rgba(255,255,255,0.2)" : "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: activeCategory === "all" ? "#fff" : P }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: activeCategory === "all" ? "#fff" : "#111827", fontFamily: HF }}>All Categories</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: activeCategory === "all" ? "rgba(255,255,255,0.7)" : "#9CA3AF", fontFamily: BF }}>{totalQuestions}</span>
              </div>

              {/* Category items */}
              {faqSections.map((s, i) => {
                const meta = catMeta[s.id];
                const isActive = activeCategory === s.id;
                return (
                  <div key={s.id} className={`nav-item${isActive ? " active" : ""}`} onClick={() => scrollToSection(s.id)} style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, background: isActive ? `${meta.accent}08` : "transparent", borderBottom: i < faqSections.length - 1 ? "1px solid #F3F4F6" : "none", ...(isActive ? { borderLeft: `3px solid ${meta.accent}` } : {}) }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: isActive ? `${meta.accent}15` : "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.accent, transition: "all 0.2s" }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? "#111827" : "#4B5563", fontFamily: HF, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? meta.accent : "#C7CBD1", fontFamily: BF }}>{s.items.length}</span>
                  </div>
                );
              })}

              {/* Bottom CTA */}
              <div style={{ padding: "14px 18px", borderTop: "1px solid #F3F4F6", background: "#FAFAFB" }}>
                <div onClick={() => navigate("/contact")} style={{ padding: "10px 0", borderRadius: 10, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: BF, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  <span>Can't find your answer?</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT — FAQ questions */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Search results info */}
            {searchQuery.trim() && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#6B7280" }}>{filteredSections.reduce((a, s) => a + s.items.length, 0)} result{filteredSections.reduce((a, s) => a + s.items.length, 0) !== 1 ? "s" : ""} for "{searchQuery}"</span>
                <span onClick={() => setSearchQuery("")} style={{ fontSize: 13, color: P, fontWeight: 600, cursor: "pointer" }}>Clear search</span>
              </div>
            )}

            {/* Empty state */}
            {filteredSections.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></div>
                <h3 style={{ fontFamily: HF, fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>No results found</h3>
                <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 16 }}>We couldn't find any questions matching "{searchQuery}"</p>
                <span onClick={() => setSearchQuery("")} style={{ color: P, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Clear search</span>
                <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 12 }}>Or email us at <a href="mailto:support@dtflayout.com" style={{ color: P, textDecoration: "none" }}>support@dtflayout.com</a></p>
              </div>
            ) : (
              filteredSections.map(section => {
                const meta = catMeta[section.id];
                return (
                <div key={section.id} ref={el => { sectionRefs.current[section.id] = el; }} style={{ marginBottom: 48, scrollMarginTop: 40 }}>
                  {/* Section Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: meta.tint, border: `1px solid ${meta.accent}12` }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: meta.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>{meta.icon}</div>
                    <h2 style={{ fontFamily: HF, fontSize: 18, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.2, flex: 1 }}>{section.title}</h2>
                    <span style={{ fontSize: 11, fontWeight: 600, color: meta.accent, background: "#fff", padding: "3px 10px", borderRadius: 99, border: `1px solid ${meta.accent}20`, flexShrink: 0 }}>{section.items.length}</span>
                  </div>

                  {/* FAQ Items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {section.items.map((faq, i) => {
                      const faqKey = `${section.id}-${i}`;
                      const isOpen = openFaq === faqKey;
                      return (
                        <div key={i} className="faq-item" onClick={() => setOpenFaq(isOpen ? null : faqKey)} style={{ background: "#fff", borderRadius: 10, border: isOpen ? `1px solid ${meta.accent}40` : "1px solid #E5E7EB", padding: "14px 18px", cursor: "pointer", boxShadow: isOpen ? `0 3px 12px ${meta.accent}10` : "0 1px 2px rgba(0,0,0,0.02)", transition: "all 0.3s ease", borderLeft: isOpen ? `3px solid ${meta.accent}` : "3px solid transparent" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: HF, flex: 1, paddingRight: 10, lineHeight: 1.4 }}>{faq.q}</span>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: isOpen ? `${meta.accent}12` : "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke={isOpen ? meta.accent : "#9CA3AF"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                          </div>
                          {isOpen && <div onClick={e => e.stopPropagation()} style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.7, margin: "10px 0 0", paddingRight: 32 }}>{faq.a}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );})
            )}
          </div>
        </div>
      </section>

      {/* ═══ QUICK LINKS ═══ */}
      <section style={{ padding: "80px 40px", background: "#fff", position: "relative" }}>
        <Dots o={0.04} /><Sq top={40} right={100} size={28} rotate={15} /><Sq bottom={50} left={120} size={24} rotate={-18} />
        <div style={{ maxWidth: 920, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Pill>Explore More</Pill>
            <h2 style={{ fontFamily: HF, fontSize: 38, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "18px 0 0" }}>Quick Links</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { title: "Pricing & Savings Calculator", desc: "Compare DTF Layout vs competitors with your own numbers", to: "/pricing", icon: catMeta.pricing.icon, accent: catMeta.pricing.accent },
              { title: "Website Integration Guide", desc: "See how the embeddable builder works on your site", to: "/product/website-integration", icon: catMeta["website-integration"].icon, accent: catMeta["website-integration"].accent },
              { title: "Quick Store Features", desc: "Launch your standalone storefront in minutes", to: "/product/quick-store", icon: catMeta["quick-store"].icon, accent: catMeta["quick-store"].accent },
            ].map((card, i) => (
              <Link key={i} to={card.to} className="ql-card" style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 28, textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${card.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", color: card.accent }}>{card.icon}</div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", fontFamily: HF, marginBottom: 4 }}>{card.title}</div>
                  <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{card.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: "120px 40px", position: "relative", overflow: "hidden" }}>
        <Dots o={0.1} /><Sq top={60} right={160} size={34} rotate={15} /><Sq bottom={60} left={140} size={28} rotate={-20} />
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </div>
          <h2 style={{ fontFamily: HF, fontSize: 46, fontWeight: 800, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 14px" }}>Still have questions?</h2>
          <p style={{ fontSize: 17, color: "#4B5563", lineHeight: 1.7, margin: "0 0 8px" }}>We respond to every message — usually within a few hours.</p>
          <p style={{ fontSize: 15, color: "#9CA3AF", margin: "0 0 40px" }}>Email us at <a href="mailto:support@dtflayout.com" style={{ color: P, fontWeight: 600, textDecoration: "none" }}>support@dtflayout.com</a> or use the contact form.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            <Btn sz="l" onClick={() => navigate("/contact")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 4 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> Contact Us</Btn>
            <Btn v="o" sz="l" onClick={() => navigate("/signup")}>Try DTF Layout Free →</Btn>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", padding: "0 40px 32px", background: "linear-gradient(180deg, #1E1B4B, #0F0D2E)", color: "rgba(165,180,252,0.6)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.3) 20%, rgba(129,140,248,0.5) 50%, rgba(99,102,241,0.3) 80%, transparent 95%)" }} />
        <div style={{ paddingTop: 64 }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div>
                  <span style={{ fontFamily: HF, fontWeight: 700, fontSize: 15, color: "#fff" }}>DTF Layout</span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>Smart DTF sheet builder for printers worldwide. Auto-arrange, optimize, and print — all from one platform.</p>
              </div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Product</h4>{[{ l: "Gang Sheet Builder", to: "/product/gang-sheet-builder" }, { l: "Website Integration", to: "/product/website-integration" }, { l: "Quick Store", to: "/product/quick-store" }, { l: "Pricing", to: "/pricing" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Company</h4>{[{ l: "FAQ", to: "/faq" }, { l: "Contact", to: "/contact" }, { l: "Blog", to: "/" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
              <div><h4 style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Legal</h4>{[{ l: "Privacy Policy", to: "/privacy-policy" }, { l: "Terms & Conditions", to: "/terms-conditions" }, { l: "Refund Policy", to: "/refund-policy" }].map(item => <Link key={item.l} to={item.to} style={{ fontSize: 14, marginBottom: 10, display: "block", color: "inherit", textDecoration: "none" }}>{item.l}</Link>)}</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>© 2026 DTF Layout · Data Canvas Tech. All rights reserved.</span>
              <span style={{ fontSize: 13, cursor: "pointer" }}>dtflayout@gmail.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
