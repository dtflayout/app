import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { QuickStore, FONT_PAIRINGS } from '@/types/quickStore';
import { Phone, Mail, MessageSquare, Store, User, LogIn, Menu, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import CustomerLoginModal from '@/components/storefront/CustomerLoginModal';

interface Props {
  store: QuickStore;
  children: React.ReactNode;
}

// ─── Footer Component ─────────────────────────────────────────────────────────
interface FooterProps { store: QuickStore; basePath: string; isLoggedIn: boolean; }

function FooterLogo({ store }: { store: QuickStore }) {
  return store.logo_url
    ? <img src={store.logo_url} alt={store.store_name} className="h-8 w-8 rounded-lg object-contain" />
    : <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: store.color_primary }}><Store className="h-4 w-4 text-white" /></div>;
}

function FooterLinks({ store, basePath, isLoggedIn, className }: FooterProps & { className?: string }) {
  const links = [
    { to: basePath || '/', label: 'Home' },
    { to: `${basePath}/products`, label: 'Products' },
    { to: `${basePath}/contact`, label: 'Contact Us' },
    ...(isLoggedIn ? [{ to: `${basePath}/account`, label: 'My Account' }] : []),
  ];
  return (
    <>
      {links.map(l => (
        <Link key={l.to} to={l.to} className={className}>{l.label}</Link>
      ))}
    </>
  );
}

function FooterContact({ store, className, iconClass }: { store: QuickStore; className?: string; iconClass?: string }) {
  return (
    <>
      {store.phone && <a href={`tel:${store.phone}`} className={`flex items-center gap-2 ${className}`}><Phone className={iconClass ?? 'h-4 w-4'} />{store.phone}</a>}
      {store.email && <a href={`mailto:${store.email}`} className={`flex items-center gap-2 ${className}`}><Mail className={iconClass ?? 'h-4 w-4'} />{store.email}</a>}
      {store.whatsapp && <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 ${className}`}><MessageSquare className={iconClass ?? 'h-4 w-4'} />WhatsApp</a>}
    </>
  );
}

const POWERED = <p className="text-xs opacity-50">Powered by <a href="https://dtflayout.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-100">DTF Layout</a></p>;

function StoreFooter({ store, basePath, isLoggedIn }: FooterProps) {
  const style = store.footer_style ?? 'classic';
  const p = store.color_primary;

  // ── 1. Classic ──────────────────────────────────────────────────────────────
  if (style === 'classic') return (
    <footer className="border-t py-10 mt-auto bg-white" style={{ borderColor: `${p}20` }}>
      <div className="w-full px-8 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3"><FooterLogo store={store} /><span className="font-semibold text-gray-900">{store.store_name}</span></div>
            {store.address && <p className="text-sm text-gray-500">{store.address}</p>}
            {store.city && <p className="text-sm text-gray-500">{store.city}{store.country ? `, ${store.country}` : ''}</p>}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
            <div className="space-y-2"><FooterLinks store={store} basePath={basePath} isLoggedIn={isLoggedIn} className="block text-sm text-gray-500 hover:text-gray-800 transition-colors" /></div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
            <div className="space-y-2"><FooterContact store={store} className="text-sm text-gray-500 hover:text-gray-800 transition-colors" /></div>
          </div>
        </div>
        <div className="border-t mt-8 pt-6 flex items-center justify-between text-gray-400">{POWERED}</div>
      </div>
    </footer>
  );

  // ── 2. Minimal ──────────────────────────────────────────────────────────────
  if (style === 'minimal') return (
    <footer className="border-t py-8 mt-auto bg-white" style={{ borderColor: `${p}20` }}>
      <div className="container mx-auto px-6 max-w-6xl flex flex-col items-center gap-5">
        <div className="flex items-center gap-2"><FooterLogo store={store} /><span className="font-semibold text-gray-900">{store.store_name}</span></div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <FooterLinks store={store} basePath={basePath} isLoggedIn={isLoggedIn} className="text-sm text-gray-500 hover:text-gray-800 transition-colors" />
        </nav>
        <div className="flex items-center gap-5"><FooterContact store={store} className="text-sm text-gray-500 hover:text-gray-800 transition-colors" iconClass="h-3.5 w-3.5" /></div>
        <div className="text-center text-gray-400">{POWERED}</div>
      </div>
    </footer>
  );

  // ── 3. Dark ─────────────────────────────────────────────────────────────────
  if (style === 'dark') return (
    <footer className="mt-auto py-12" style={{ backgroundColor: '#0f172a' }}>
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-3"><FooterLogo store={store} /><span className="font-semibold text-white">{store.store_name}</span></div>
            {store.address && <p className="text-sm text-slate-400">{store.address}</p>}
            {store.city && <p className="text-sm text-slate-400">{store.city}{store.country ? `, ${store.country}` : ''}</p>}
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">Quick Links</h3>
            <div className="space-y-2"><FooterLinks store={store} basePath={basePath} isLoggedIn={isLoggedIn} className="block text-sm text-slate-400 hover:text-white transition-colors" /></div>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">Contact</h3>
            <div className="space-y-2"><FooterContact store={store} className="text-sm text-slate-400 hover:text-white transition-colors" /></div>
          </div>
        </div>
        <div className="pt-6 flex items-center justify-between">
          <div className="text-slate-500 text-xs">{POWERED}</div>
          <div className="h-1 w-16 rounded-full" style={{ backgroundColor: p }} />
        </div>
      </div>
    </footer>
  );

  // ── 4. Bold ─────────────────────────────────────────────────────────────────
  if (style === 'bold') return (
    <footer className="mt-auto bg-white" style={{ borderTop: `4px solid ${p}` }}>
      <div className="container mx-auto px-6 max-w-6xl py-12">
        <p className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-none" style={{ color: p, opacity: 0.12 }}>{store.store_name}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 -mt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4"><FooterLogo store={store} /><span className="font-bold text-lg text-gray-900">{store.store_name}</span></div>
            {store.address && <p className="text-sm text-gray-500 flex items-center gap-2"><MapPin className="h-4 w-4 flex-shrink-0" />{store.address}{store.city ? `, ${store.city}` : ''}</p>}
            <div className="flex flex-col gap-1.5"><FooterContact store={store} className="text-sm text-gray-500 hover:text-gray-800 transition-colors" /></div>
          </div>
          <div className="flex flex-col md:items-end justify-end gap-3">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 md:justify-end">
              <FooterLinks store={store} basePath={basePath} isLoggedIn={isLoggedIn} className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors" />
            </nav>
            <div className="text-gray-400">{POWERED}</div>
          </div>
        </div>
      </div>
    </footer>
  );

  // ── 5. Compact ──────────────────────────────────────────────────────────────
  return (
    <footer className="mt-auto border-t py-8 bg-gray-50" style={{ borderColor: `${p}20` }}>
      <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <FooterLogo store={store} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{store.store_name}</p>
            {store.city && <p className="text-xs text-gray-400">{store.city}{store.country ? `, ${store.country}` : ''}</p>}
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <FooterLinks store={store} basePath={basePath} isLoggedIn={isLoggedIn} className="text-sm text-gray-500 hover:text-gray-800 transition-colors" />
        </nav>
        <div className="flex flex-col gap-1.5 items-start md:items-end">
          <FooterContact store={store} className="text-xs text-gray-500 hover:text-gray-700 transition-colors" iconClass="h-3.5 w-3.5" />
          <div className="text-gray-400">{POWERED}</div>
        </div>
      </div>
    </footer>
  );
}



// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHeaderColors(store: QuickStore): { bg: string; text: string; border: string } {
  const color = store.header_color ?? 'light';
  if (color === 'dark') return { bg: '#111827', text: '#f9fafb', border: 'rgba(255,255,255,0.08)' };
  if (color === 'custom') {
    const bg = store.header_custom_color ?? store.color_primary;
    return { bg, text: '#ffffff', border: 'rgba(255,255,255,0.15)' };
  }
  return { bg: 'rgba(255,255,255,0.97)', text: store.color_text, border: `${store.color_primary}20` };
}

function useHeaderState(store: QuickStore) {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${store.slug}` : '';
  const { customer, isLoggedIn, login } = useCustomerAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogin = (c: any) => {
    login(c);
    navigate(`${basePath}/account`);
  };

  return { basePath, customer, isLoggedIn, login: handleLogin, showLogin, setShowLogin, mobileOpen, setMobileOpen };
}

const NAV_LINKS = (basePath: string) => [
  { to: basePath || '/', label: 'Home' },
  { to: `${basePath}/products`, label: 'Products' },
  { to: `${basePath}/contact`, label: 'Contact' },
];

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  store: QuickStore;
  basePath: string;
  isLoggedIn: boolean;
  customer: any;
  onLoginClick: () => void;
  bg: string;
  text: string;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  open, onClose, store, basePath, isLoggedIn, customer, onLoginClick, bg, text,
}) => {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div
        className="fixed top-0 left-0 right-0 z-50 shadow-xl rounded-b-2xl"
        style={{ backgroundColor: bg }}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/10">
          <Link to={basePath || '/'} onClick={onClose} className="flex items-center">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.store_name} className="h-10 w-auto object-contain" />
            ) : (
              <div className="h-10 px-3 rounded-lg flex items-center justify-center gap-2" style={{ backgroundColor: store.color_primary }}>
                <Store className="h-4 w-4 text-white" />
                <span className="font-bold text-white text-sm">{store.store_name}</span>
              </div>
            )}
          </Link>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/10 transition-colors" style={{ color: text }}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="px-5 py-4 space-y-1">
          {NAV_LINKS(basePath).map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onClose}
              className="flex items-center h-11 px-3 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors"
              style={{ color: text }}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/10 mt-2">
            {isLoggedIn ? (
              <Link
                to={`${basePath}/account`}
                onClick={onClose}
                className="flex items-center gap-2 h-11 px-3 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors"
                style={{ color: text }}
              >
                <User className="h-4 w-4" />
                {customer?.name?.split(' ')[0] || 'My Account'}
              </Link>
            ) : (
              <button
                onClick={() => { onClose(); onLoginClick(); }}
                className="flex items-center gap-2 h-11 px-3 w-full rounded-xl text-sm font-medium hover:bg-black/5 transition-colors"
                style={{ color: text }}
              >
                <LogIn className="h-4 w-4" />
                Login
              </button>
            )}
          </div>
          {/* Contact quick links */}
          {(store.phone || store.whatsapp) && (
            <div className="pt-2 flex gap-3 px-3">
              {store.phone && (
                <a href={`tel:${store.phone}`} className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity" style={{ color: text }}>
                  <Phone className="h-3.5 w-3.5" />{store.phone}
                </a>
              )}
              {store.whatsapp && (
                <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity" style={{ color: text }}>
                  <MessageSquare className="h-3.5 w-3.5" />WhatsApp
                </a>
              )}
            </div>
          )}
        </nav>
      </div>
    </>
  );
};

// ─── Announcement Bar ─────────────────────────────────────────────────────────

const AnnouncementBar: React.FC<{ store: QuickStore }> = ({ store }) => {
  const [current, setCurrent] = useState(0);
  const items = (store.topbar_items ?? []).filter(Boolean);
  const style = store.topbar_style ?? 'static';
  const bgColor = store.topbar_bg_color ?? store.color_primary;
  const textColor = store.topbar_text_color ?? '#ffffff';

  useEffect(() => {
    if (style !== 'carousel' || items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [style, items.length]);

  if (!store.topbar_enabled || items.length === 0) return null;

  // For marquee: join items with a spacious separator, duplicate for seamless loop
  const marqueeText = items.join('\u00A0\u00A0\u00A0\u00A0\u2014\u00A0\u00A0\u00A0\u00A0');
  const marqueeDuration = Math.max(18, items.join(' ').length * 0.35) + 's';

  return (
    <div
      className="text-xs py-1.5 font-medium overflow-hidden"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {style === 'static' && (
        <div className="text-center px-4">{items[0]}</div>
      )}

      {style === 'carousel' && (
        <div className="text-center px-4">
          <span
            key={current}
            style={{ animation: 'fadeIn 0.4s ease' }}
            className="inline-block"
          >
            {items[current]}
          </span>
        </div>
      )}

      {style === 'marquee' && (
        <div className="flex overflow-hidden">
          {/* Two tracks, each 100vw wide, items spread evenly with space-around.
              Same animation: both slide -100% of their own width.
              Track 2 starts flush right of track 1 → seamless loop. */}
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 items-center justify-around"
              style={{
                minWidth: '100%',
                animation: `marquee ${marqueeDuration} linear infinite`,
              }}
            >
              {items.map((item, i) => (
                <span key={i} className="px-6 tracking-wide">{item}</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Account Button ───────────────────────────────────────────────────────────

const AccountBtn: React.FC<{
  isLoggedIn: boolean; customer: any; basePath: string; text: string; onLogin: () => void;
}> = ({ isLoggedIn, customer, basePath, text, onLogin }) => (
  isLoggedIn ? (
    <Link to={`${basePath}/account`}>
      <Button variant="outline" size="sm" className="gap-2 border-current" style={{ color: text, borderColor: `${text}30` }}>
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{customer?.name?.split(' ')[0] || 'Account'}</span>
      </Button>
    </Link>
  ) : (
    <Button variant="outline" size="sm" className="gap-2 border-current" onClick={onLogin} style={{ color: text, borderColor: `${text}30` }}>
      <LogIn className="h-4 w-4" />
      <span className="hidden sm:inline">Login</span>
    </Button>
  )
);

// ─── Logo Block ───────────────────────────────────────────────────────────────

const LogoBlock: React.FC<{ store: QuickStore; to: string; text: string; showTagline?: boolean }> = ({ store, to, text }) => (
  <Link to={to} className="flex items-center shrink-0">
    {store.logo_url ? (
      <img src={store.logo_url} alt={store.store_name} className="h-[3rem] w-auto object-contain" />
    ) : (
      <div className="h-[3rem] px-4 rounded-lg flex items-center justify-center shrink-0 gap-2" style={{ backgroundColor: store.color_primary }}>
        <Store className="h-5 w-5 text-white" />
        <span className="font-bold text-white text-lg">{store.store_name}</span>
      </div>
    )}
  </Link>
);

// ─── Header Styles ────────────────────────────────────────────────────────────

function ClassicHeader({ store }: { store: QuickStore }) {
  const { basePath, customer, isLoggedIn, login, showLogin, setShowLogin, mobileOpen, setMobileOpen } = useHeaderState(store);
  const { bg, text, border } = getHeaderColors(store);

  return (
    <>
      <AnnouncementBar store={store} />
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ backgroundColor: bg, borderColor: border }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <LogoBlock store={store} to={basePath || '/'} text={text} />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {NAV_LINKS(basePath).map(l => (
                <Link key={l.to} to={l.to} className="text-[15px] font-medium hover:opacity-70 transition-opacity" style={{ color: text }}>{l.label}</Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {store.phone && (
                <a href={`tel:${store.phone}`} className="p-2 rounded-lg hover:bg-black/5 transition-colors hidden sm:block">
                  <Phone className="h-4 w-4" style={{ color: store.color_primary }} />
                </a>
              )}
              <div className="hidden md:block">
                <AccountBtn isLoggedIn={isLoggedIn} customer={customer} basePath={basePath} text={text} onLogin={() => setShowLogin(true)} />
              </div>
              {/* Hamburger */}
              <button className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors" onClick={() => setMobileOpen(true)} style={{ color: text }}>
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} store={store} basePath={basePath} isLoggedIn={isLoggedIn} customer={customer} onLoginClick={() => setShowLogin(true)} bg={bg} text={text} />
      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={login} storeId={store.id} storeName={store.store_name} primaryColor={store.color_primary} />
    </>
  );
}

function MinimalHeader({ store }: { store: QuickStore }) {
  const { basePath, customer, isLoggedIn, login, showLogin, setShowLogin, mobileOpen, setMobileOpen } = useHeaderState(store);
  const { bg, text, border } = getHeaderColors(store);

  return (
    <>
      <AnnouncementBar store={store} />
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ backgroundColor: bg, borderColor: border }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <LogoBlock store={store} to={basePath || '/'} text={text} />

            <div className="hidden md:flex items-center gap-5">
              {NAV_LINKS(basePath).map(l => (
                <Link key={l.to} to={l.to} className="text-[15px] font-medium hover:opacity-70 transition-opacity" style={{ color: text }}>{l.label}</Link>
              ))}
              <div className="w-px h-4 opacity-20" style={{ backgroundColor: text }} />
              <AccountBtn isLoggedIn={isLoggedIn} customer={customer} basePath={basePath} text={text} onLogin={() => setShowLogin(true)} />
            </div>

            <button className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors" onClick={() => setMobileOpen(true)} style={{ color: text }}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} store={store} basePath={basePath} isLoggedIn={isLoggedIn} customer={customer} onLoginClick={() => setShowLogin(true)} bg={bg} text={text} />
      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={login} storeId={store.id} storeName={store.store_name} primaryColor={store.color_primary} />
    </>
  );
}

function CenteredHeader({ store }: { store: QuickStore }) {
  const { basePath, customer, isLoggedIn, login, showLogin, setShowLogin, mobileOpen, setMobileOpen } = useHeaderState(store);
  const { bg, text, border } = getHeaderColors(store);

  return (
    <>
      <AnnouncementBar store={store} />
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ backgroundColor: bg, borderColor: border }}>
        {/* Desktop: centered */}
        <div className="hidden md:flex flex-col items-center py-3 container mx-auto px-4 gap-2">
          <LogoBlock store={store} to={basePath || '/'} text={text} />
          <div className="flex items-center gap-6">
            {NAV_LINKS(basePath).map(l => (
              <Link key={l.to} to={l.to} className="text-[15px] font-medium hover:opacity-70 transition-opacity" style={{ color: text }}>{l.label}</Link>
            ))}
            <AccountBtn isLoggedIn={isLoggedIn} customer={customer} basePath={basePath} text={text} onLogin={() => setShowLogin(true)} />
          </div>
        </div>
        {/* Mobile: standard row */}
        <div className="md:hidden flex items-center justify-between h-14 px-4">
          <LogoBlock store={store} to={basePath || '/'} text={text} />
          <button className="p-2 rounded-lg hover:bg-black/5 transition-colors" onClick={() => setMobileOpen(true)} style={{ color: text }}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} store={store} basePath={basePath} isLoggedIn={isLoggedIn} customer={customer} onLoginClick={() => setShowLogin(true)} bg={bg} text={text} />
      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={login} storeId={store.id} storeName={store.store_name} primaryColor={store.color_primary} />
    </>
  );
}

function BoldHeader({ store }: { store: QuickStore }) {
  const { basePath, customer, isLoggedIn, login, showLogin, setShowLogin, mobileOpen, setMobileOpen } = useHeaderState(store);
  const { bg, text, border } = getHeaderColors(store);

  return (
    <>
      <AnnouncementBar store={store} />
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ backgroundColor: bg, borderColor: border }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <LogoBlock store={store} to={basePath || '/'} text={text} showTagline />

            <div className="hidden md:flex items-center gap-5">
              {NAV_LINKS(basePath).map(l => (
                <Link key={l.to} to={l.to} className="text-[15px] font-medium hover:opacity-70 transition-opacity" style={{ color: text }}>{l.label}</Link>
              ))}
              <Link to={`${basePath}/products`}>
                <Button size="sm" style={{ backgroundColor: store.color_primary }} className="text-white hover:opacity-90 shadow-sm">
                  Order Now →
                </Button>
              </Link>
            </div>

            <button className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors" onClick={() => setMobileOpen(true)} style={{ color: text }}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} store={store} basePath={basePath} isLoggedIn={isLoggedIn} customer={customer} onLoginClick={() => setShowLogin(true)} bg={bg} text={text} />
      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={login} storeId={store.id} storeName={store.store_name} primaryColor={store.color_primary} />
    </>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

const StorefrontLayout: React.FC<Props> = ({ store, children }) => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${store.slug}` : '';
  const { isLoggedIn } = useCustomerAuth();

  const HeaderComponent = {
    classic: ClassicHeader,
    minimal: MinimalHeader,
    centered: CenteredHeader,
    bold: BoldHeader,
  }[store.header_style ?? 'classic'] ?? ClassicHeader;

  // Resolve font pairing
  const fontConfig = FONT_PAIRINGS.find(fp => fp.id === store.font_pairing) ?? FONT_PAIRINGS[0];

  return (
    <>
      {/* Google Fonts + Marquee keyframes */}
      <link rel="stylesheet" href={fontConfig.googleImport} />
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-100%) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundColor: store.color_background,
          color: store.color_text,
          fontFamily: `'${fontConfig.body}', sans-serif`,
        }}
      >
        {/* Apply heading font via CSS custom property */}
        <style>{`
          h1, h2, h3 { font-family: '${fontConfig.heading}', sans-serif; }
        `}</style>

        <HeaderComponent store={store} />

        <main className="flex-1">{children}</main>

        {/* Footer */}
        <StoreFooter store={store} basePath={basePath} isLoggedIn={isLoggedIn} />
      </div>
    </>
  );
};

export default StorefrontLayout;
