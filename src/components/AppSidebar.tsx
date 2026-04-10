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
  Settings,
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
    icon: <LayoutDashboard className="w-5 h-5 flex-shrink-0" />,
    path: "/dashboard",
  },
  {
    label: "Sheet Builder",
    icon: <Layers className="w-5 h-5 flex-shrink-0" />,
    submenu: [
      { label: "150 DPI", icon: <Layers className="w-4 h-4 flex-shrink-0" />, path: "/builder-150" },
      { label: "300 DPI", icon: <Zap className="w-4 h-4 flex-shrink-0" />, path: "/builder-300" },
    ],
  },
  {
    label: "Image Enhancer",
    icon: <Sparkles className="w-5 h-5 flex-shrink-0" />,
    path: "/app/image-enhancer",
  },
  {
    label: "History",
    icon: <FileText className="w-5 h-5 flex-shrink-0" />,
    path: "/logs",
  },
  {
    label: "Billing",
    icon: <CreditCard className="w-5 h-5 flex-shrink-0" />,
    path: "/billing",
  },
  {
    label: "Website Integration",
    icon: <Globe className="w-5 h-5 flex-shrink-0" />,
    path: "/app/website-integration",
  },
  {
    label: "Quick Store",
    icon: <Store className="w-5 h-5 flex-shrink-0" />,
    path: "/app/quick-store",
    badge: "New",
  },
  {
    label: "Settings",
    icon: <Settings className="w-5 h-5 flex-shrink-0" />,
    path: "/settings",
  },
  {
    label: "Help & Support",
    icon: <HelpCircle className="w-5 h-5 flex-shrink-0" />,
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
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/auth");
    } catch (error) {
      console.error("[AppSidebar] Logout error:", error);
      toast({
        title: "Logged out",
        description: "Session cleared.",
      });
      navigate("/auth");
    }
  };

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const isSubmenuActive = (submenu: { path: string }[]) =>
    submenu.some((item) => location.pathname === item.path);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  // Calculate usage percentage (assuming initial plan credits)
  // We'll use a reasonable default total based on common plan sizes
  const totalPlanCredits = 50000; // Default plan credits - can be made dynamic later
  const usedCredits = Math.max(totalPlanCredits - creditsBalance, 0);
  const usagePercentage = Math.min(Math.max((usedCredits / totalPlanCredits) * 100, 0), 100);

  // Desktop sidebar content with hover expand/collapse
  const DesktopSidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-sidebar text-indigo-300 overflow-hidden">
      {/* Logo */}
      <div className={cn(
        "border-b border-indigo-500/15 transition-all duration-300 ease-in-out",
        isExpanded ? "p-6" : "p-4"
      )}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img
            src={isExpanded ? "/DTF-Layout-WHITE-logo-text.png" : "/logo-white.png"}
            alt="DTF Layout"
            className={cn(
              "transition-all duration-300 ease-in-out",
              isExpanded ? "h-10" : "h-8"
            )}
          />
        </button>
      </div>

      {/* Credits Badge */}
      <div className={cn(
        "border-b border-indigo-500/15 transition-all duration-300 ease-in-out",
        isExpanded ? "px-4 py-3" : "px-2 py-3"
      )}>
        <div className={cn(
          "bg-indigo-600/15 border border-indigo-500/20 rounded-xl transition-all duration-300 ease-in-out",
          isExpanded ? "px-3 py-2" : "px-2 py-2"
        )}>
          <p className={cn(
            "text-xs text-indigo-300/70 mb-1 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
            isExpanded ? "opacity-100" : "opacity-0 h-0 mb-0"
          )}>Credits Balance</p>
          <p className={cn(
            "font-bold text-indigo-300 transition-all duration-300 ease-in-out",
            isExpanded ? "text-lg" : "text-sm text-center"
          )}>
            {isExpanded ? (
              <>{creditsBalance.toLocaleString('en-IN')} <span className="text-sm font-normal text-indigo-300/50">sq.in</span></>
            ) : (
              <span title={`${creditsBalance.toLocaleString('en-IN')} sq.in`}>
                {creditsBalance >= 1000 ? `${(creditsBalance / 1000).toFixed(0)}k` : creditsBalance}
              </span>
            )}
          </p>
          {/* Progress Bar */}
          <div className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            isExpanded ? "mt-2 opacity-100" : "mt-1 opacity-100"
          )}>
            <div className="w-full bg-white/10 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-1 rounded-full transition-all duration-500"
                style={{ width: `${100 - usagePercentage}%` }}
              />
            </div>
            <p className={cn(
              "text-xs text-indigo-300/50 mt-1 transition-all duration-300 ease-in-out overflow-hidden",
              isExpanded ? "opacity-100" : "opacity-0 h-0"
            )}>
              {usagePercentage.toFixed(0)}% used
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className={cn(
        "flex-1 space-y-1 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out",
        isExpanded ? "p-4" : "p-2"
      )}>
        {menuItems.map((item) => (
          <div key={item.label}>
            {item.submenu ? (
              <>
                {/* Parent menu with submenu */}
                <button
                  onClick={() => isExpanded && toggleSubmenu(item.label)}
                  className={cn(
                    "w-full flex items-center rounded-lg text-sm font-medium transition-all duration-300 ease-in-out",
                    isExpanded ? "gap-3 px-3 py-2.5 justify-between" : "justify-center px-2 py-2.5",
                    isSubmenuActive(item.submenu)
                      ? "bg-indigo-500/10 text-indigo-100"
                      : "text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-100"
                  )}
                  title={!isExpanded ? item.label : undefined}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className={cn(
                      "transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
                      isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                    )}>{item.label}</span>
                  </div>
                  {isExpanded && (
                    expandedMenus.includes(item.label) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )
                  )}
                </button>

                {/* Submenu items */}
                {isExpanded && expandedMenus.includes(item.label) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu.map((subItem) => (
                      <button
                        key={subItem.path}
                        onClick={() => handleNavigation(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive(subItem.path)
                            ? "bg-indigo-600 text-white"
                            : "text-indigo-300/70 hover:bg-indigo-500/10 hover:text-indigo-100"
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
              /* Single menu item */
              <button
                onClick={() => handleNavigation(item.path!)}
                className={cn(
                  "w-full flex items-center rounded-lg text-sm font-medium transition-all duration-300 ease-in-out",
                  isExpanded ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5",
                  isActive(item.path!)
                    ? "bg-indigo-600 text-white"
                    : "text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-100"
                )}
                title={!isExpanded ? item.label : undefined}
              >
                {item.icon}
                <span className={cn(
                  "transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
                  isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}>{item.label}</span>
                {/* Badge for New items */}
                {item.badge && isExpanded && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* User section at bottom */}
      <div className={cn(
        "border-t border-indigo-500/15 transition-all duration-300 ease-in-out",
        isExpanded ? "p-4" : "p-2"
      )}>
        {/* User info */}
        <div className={cn(
          "mb-3 flex items-center transition-all duration-300 ease-in-out",
          isExpanded ? "gap-3" : "justify-center"
        )}>
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-indigo-300/70" />
          </div>
          <div className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
          )}>
            <p className="text-xs text-indigo-300/60">Logged in as</p>
            <p className="text-sm font-medium truncate max-w-[160px]">{user?.email}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center rounded-lg text-sm font-medium text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-100 transition-all duration-300 ease-in-out",
            isExpanded ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"
          )}
          title={!isExpanded ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
            isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
          )}>Logout</span>
        </button>
      </div>
    </div>
  );

  // Mobile sidebar content (always expanded)
  const MobileSidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-sidebar text-indigo-300">
      {/* Logo */}
      <div className="p-6 border-b border-indigo-500/15">
        <button
          onClick={() => handleNavigation("/")}
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img
            src="/DTF-Layout-WHITE-logo-text.png"
            alt="DTF Layout"
            className="h-10"
          />
        </button>
      </div>

      {/* Credits Badge */}
      <div className="px-4 py-3 border-b border-indigo-500/15">
        <div className="bg-indigo-600/15 border border-indigo-500/20 rounded-xl px-3 py-2">
          <p className="text-xs text-indigo-300/70 mb-1">Credits Balance</p>
          <p className="text-lg font-bold text-indigo-300">
            {creditsBalance.toLocaleString('en-IN')} <span className="text-sm font-normal text-indigo-300/50">sq.in</span>
          </p>
          {/* Progress Bar */}
          <div className="mt-2">
            <div className="w-full bg-white/10 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-1 rounded-full transition-all duration-500"
                style={{ width: `${100 - usagePercentage}%` }}
              />
            </div>
            <p className="text-xs text-indigo-300/50 mt-1">
              {usagePercentage.toFixed(0)}% used
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.label}>
            {item.submenu ? (
              <>
                <button
                  onClick={() => toggleSubmenu(item.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isSubmenuActive(item.submenu)
                      ? "bg-indigo-500/10 text-indigo-100"
                      : "text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {expandedMenus.includes(item.label) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {expandedMenus.includes(item.label) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu.map((subItem) => (
                      <button
                        key={subItem.path}
                        onClick={() => handleNavigation(subItem.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive(subItem.path)
                            ? "bg-indigo-600 text-white"
                            : "text-indigo-300/70 hover:bg-indigo-500/10 hover:text-indigo-100"
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
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.path!)
                    ? "bg-indigo-600 text-white"
                    : "text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-100"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {/* Badge for New items */}
                {item.badge && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* User section at bottom */}
      <div className="p-4 border-t border-indigo-500/15">
        <div className="mb-3">
          <p className="text-xs text-indigo-300/70 mb-1">Logged in as</p>
          <p className="text-sm font-medium truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gradient-sidebar text-indigo-300 shadow-lg"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop (collapsible on hover) */}
      <aside
        className={cn(
          "hidden lg:block h-screen fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out",
          isExpanded ? "w-64" : "w-[70px]"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <DesktopSidebarContent />
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-screen w-64 z-40 transform transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <MobileSidebarContent />
      </aside>
    </>
  );
};
