import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  Layers,
  Zap,
  FileText,
  CreditCard,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  User,
  Sparkles,
  Globe,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string;
  submenu?: { label: string; icon: React.ReactNode; path: string }[];
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard className="w-[18px] h-[18px] flex-shrink-0" />,
    path: "/dashboard",
  },
  {
    label: "Sheet Builder",
    icon: <Layers className="w-[18px] h-[18px] flex-shrink-0" />,
    submenu: [
      { label: "150 DPI", icon: <Layers className="w-4 h-4 flex-shrink-0" />, path: "/app" },
      { label: "300 DPI", icon: <Zap className="w-4 h-4 flex-shrink-0" />, path: "/app-300" },
    ],
  },
  {
    label: "Image Enhancer",
    icon: <Sparkles className="w-[18px] h-[18px] flex-shrink-0" />,
    path: "/app/image-enhancer",
  },
  {
    label: "History",
    icon: <FileText className="w-[18px] h-[18px] flex-shrink-0" />,
    path: "/logs",
  },
  {
    label: "Billing",
    icon: <CreditCard className="w-[18px] h-[18px] flex-shrink-0" />,
    path: "/billing",
  },
  {
    label: "Website Integration",
    icon: <Globe className="w-[18px] h-[18px] flex-shrink-0" />,
    path: "/app/website-integration",
  },
  {
    label: "Quick Store",
    icon: <Store className="w-[18px] h-[18px] flex-shrink-0" />,
    path: "/app/quick-store",
    badge: "New",
  },
  {
    label: "Help & Support",
    icon: <HelpCircle className="w-[18px] h-[18px] flex-shrink-0" />,
    path: "/support",
  },
];

export const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const { credits: creditsBalance, isLoading: creditsLoading } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Sheet Builder"]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: "Logged out", description: "You have been successfully logged out." });
      navigate("/auth");
    } catch (error) {
      console.error("[AppSidebar] Logout error:", error);
      toast({ title: "Logged out", description: "Session cleared." });
      navigate("/auth");
    }
  };

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isSubmenuActive = (submenu: { path: string }[]) => submenu.some((item) => location.pathname === item.path);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  const totalPlanCredits = 50000;
  const usedCredits = Math.max(totalPlanCredits - creditsBalance, 0);
  const usagePercentage = Math.min(Math.max((usedCredits / totalPlanCredits) * 100, 0), 100);

  // ─── Shared nav item renderer ───────────────────────────────────────────
  const renderNavItems = (alwaysExpanded: boolean) => (
    menuItems.map((item) => (
      <div key={item.label}>
        {item.submenu ? (
          <>
            <button
              onClick={() => (alwaysExpanded || isExpanded) && toggleSubmenu(item.label)}
              className={cn(
                "w-full flex items-center rounded-lg text-[13px] font-medium transition-all duration-200",
                (alwaysExpanded || isExpanded) ? "gap-2.5 px-3 py-2 justify-between" : "justify-center px-2 py-2",
                isSubmenuActive(item.submenu)
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              )}
              title={!(alwaysExpanded || isExpanded) ? item.label : undefined}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span className={cn(
                  "transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
                  (alwaysExpanded || isExpanded) ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}>{item.label}</span>
              </div>
              {(alwaysExpanded || isExpanded) && (
                expandedMenus.includes(item.label)
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {(alwaysExpanded || isExpanded) && expandedMenus.includes(item.label) && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {item.submenu.map((subItem) => (
                  <button
                    key={subItem.path}
                    onClick={() => handleNavigation(subItem.path)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors",
                      isActive(subItem.path)
                        ? "bg-indigo-600 text-white font-semibold"
                        : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    )}
                  >
                    {subItem.icon}
                    <span>{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => handleNavigation(item.path!)}
            className={cn(
              "w-full flex items-center rounded-lg text-[13px] font-medium transition-all duration-200",
              (alwaysExpanded || isExpanded) ? "gap-2.5 px-3 py-2" : "justify-center px-2 py-2",
              isActive(item.path!)
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            )}
            title={!(alwaysExpanded || isExpanded) ? item.label : undefined}
          >
            {item.icon}
            <span className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
              (alwaysExpanded || isExpanded) ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}>{item.label}</span>
            {item.badge && (alwaysExpanded || isExpanded) && (
              <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        )}
      </div>
    ))
  );

  // ─── Sidebar inner content (shared between desktop & mobile) ────────────
  const SidebarInner = ({ alwaysExpanded }: { alwaysExpanded: boolean }) => {
    const exp = alwaysExpanded || isExpanded;
    return (
      <>
        {/* Logo */}
        <div className={cn("border-b border-gray-100", exp ? "p-5 pb-4" : "p-3")}>
          <button onClick={() => handleNavigation("/")} className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className={cn(
                "font-bold text-[15px] text-gray-900 overflow-hidden whitespace-nowrap transition-all duration-300",
                exp ? "opacity-100 w-auto" : "opacity-0 w-0"
              )}>DTF Layout</span>
            </div>
          </button>
        </div>

        {/* Credits */}
        <div className={cn("border-b border-gray-100", exp ? "px-4 py-3" : "px-2 py-3")}>
          <div className={cn("bg-gray-50 border border-gray-100 rounded-xl", exp ? "px-3 py-2.5" : "px-2 py-2")}>
            <p className={cn("text-[11px] text-gray-400 mb-1 overflow-hidden whitespace-nowrap transition-all duration-300", exp ? "opacity-100" : "opacity-0 h-0 mb-0")}>Credits Balance</p>
            <p className={cn("font-bold text-gray-900 transition-all duration-300", exp ? "text-[15px]" : "text-xs text-center")}>
              {exp ? (
                <>{creditsBalance.toLocaleString('en-IN')} <span className="text-[11px] font-normal text-gray-400">sq.in</span></>
              ) : (
                <span title={`${creditsBalance.toLocaleString('en-IN')} sq.in`}>
                  {creditsBalance >= 1000 ? `${(creditsBalance / 1000).toFixed(0)}k` : creditsBalance}
                </span>
              )}
            </p>
            <div className={cn("overflow-hidden transition-all duration-300", exp ? "mt-2" : "mt-1")}>
              <div className="w-full bg-gray-100 rounded-full h-[3px]">
                <div className="bg-indigo-600 h-[3px] rounded-full transition-all duration-500" style={{ width: `${100 - usagePercentage}%` }} />
              </div>
              <p className={cn("text-[11px] text-gray-400 mt-1 overflow-hidden transition-all duration-300", exp ? "opacity-100" : "opacity-0 h-0")}>{usagePercentage.toFixed(0)}% used</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden", exp ? "p-3" : "p-2")}>
          {renderNavItems(alwaysExpanded)}
        </nav>

        {/* User */}
        <div className={cn("border-t border-gray-100", exp ? "p-3" : "p-2")}>
          <div className={cn("mb-2 flex items-center", exp ? "gap-2.5" : "justify-center")}>
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <div className={cn("overflow-hidden transition-all duration-300", exp ? "opacity-100 w-auto" : "opacity-0 w-0")}>
              <p className="text-[11px] text-gray-400">Logged in as</p>
              <p className="text-[13px] font-medium text-gray-700 truncate max-w-[160px]">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center rounded-lg text-[13px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all duration-200",
              exp ? "gap-2.5 px-3 py-2" : "justify-center px-2 py-2"
            )}
            title={!exp ? "Logout" : undefined}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <span className={cn("overflow-hidden whitespace-nowrap transition-all duration-300", exp ? "opacity-100 w-auto" : "opacity-0 w-0")}>Logout</span>
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white text-gray-600 shadow-md border border-gray-200"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Desktop — Floating card sidebar */}
      <aside
        className={cn(
          "hidden lg:block h-screen fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out",
          isExpanded ? "w-[266px]" : "w-[76px]"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex flex-col h-[calc(100%-16px)] bg-white overflow-hidden rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] m-2 transition-all duration-300 ease-in-out">
          <SidebarInner alwaysExpanded={false} />
        </div>
      </aside>

      {/* Mobile — Full-height sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-screen w-[280px] z-40 bg-white transform transition-transform duration-300 ease-in-out shadow-xl",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <SidebarInner alwaysExpanded={true} />
        </div>
      </aside>
    </>
  );
};
