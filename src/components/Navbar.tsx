import { useOutseta } from "@/contexts/OutsetaContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { FileText, LayoutDashboard, AlertTriangle, AlertCircle, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Navbar = () => {
  const { user, logout: contextLogout } = useOutseta();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    console.log("[Navbar] Logout button clicked");

    try {
      // Use the centralized logout function from context
      await contextLogout();

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });

      console.log("[Navbar] Redirecting to /auth");
      navigate("/auth");
    } catch (error) {
      console.error("[Navbar] Logout error:", error);

      toast({
        title: "Logged out",
        description: "Session cleared.",
      });

      navigate("/auth");
    }
  };

  if (!user) {
    return null;
  }

  // Debug: Log the full user object to see structure
  console.log("[Navbar] Full user object:", user);
  console.log("[Navbar] user.Account:", user.Account);
  console.log("[Navbar] All user keys:", Object.keys(user));

  if (user.Account) {
    console.log("[Navbar] Account keys:", Object.keys(user.Account));
    console.log("[Navbar] Account object:", user.Account);
  }

  // Get credits balance from Account custom property
  // Try multiple possible property names
  const creditsBalance =
    user.Account?.credits_balance ??
    user.Account?.creditsBalance ??
    user.Account?.CreditsBalance ??
    user.credits_balance ??
    0;

  console.log("[Navbar] Credits balance extracted:", creditsBalance);

  // Determine credit warning level
  const getCreditWarningLevel = () => {
    if (creditsBalance === 0) return "critical";
    if (creditsBalance <= 2300) return "urgent";
    if (creditsBalance < 6900) return "warning";
    return "normal";
  };

  const warningLevel = getCreditWarningLevel();

  // Get badge styling based on warning level
  const getCreditsBadgeConfig = () => {
    switch (warningLevel) {
      case "critical":
        return {
          className: "bg-red-600 hover:bg-red-700 text-white border-red-700",
          icon: <AlertCircle className="w-4 h-4 mr-1" />,
          tooltip: "Out of credits! Purchase more to continue."
        };
      case "urgent":
        return {
          className: "bg-red-500 hover:bg-red-600 text-white border-red-600",
          icon: <AlertCircle className="w-4 h-4 mr-1" />,
          tooltip: `Low credits warning! Only ${creditsBalance.toLocaleString()} sq.in remaining.`
        };
      case "warning":
        return {
          className: "bg-orange-500 hover:bg-orange-600 text-white border-orange-600",
          icon: <AlertTriangle className="w-4 h-4 mr-1" />,
          tooltip: `Running low on credits. ${creditsBalance.toLocaleString()} sq.in remaining.`
        };
      default:
        return {
          className: "bg-green-600 hover:bg-green-700 text-white border-green-700",
          icon: null,
          tooltip: `You have ${creditsBalance.toLocaleString()} sq.in available.`
        };
    }
  };

  const badgeConfig = getCreditsBadgeConfig();

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">DTF Collage Creator</h1>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Button
              variant={location.pathname === '/app' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/app')}
              className="gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Create
            </Button>
            <Button
              variant={location.pathname === '/app-300' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/app-300')}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              300 DPI
            </Button>
            <Button
              variant={location.pathname === '/logs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/logs')}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              History
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Credits Display with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`text-sm font-semibold px-3 py-1.5 flex items-center gap-1 cursor-help ${badgeConfig.className}`}
                >
                  {badgeConfig.icon}
                  Credits: {creditsBalance.toLocaleString()} sq.in
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{badgeConfig.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User Email */}
          <div className="text-sm text-gray-600">
            <span className="font-medium">{user.Email}</span>
          </div>

          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
};
