import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
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
  const { user, signOut } = useAuth();
  const { credits: creditsBalance } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    console.log("[Navbar] Logout button clicked");

    try {
      // Use the centralized logout function from context
      await signOut();

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

  // Credits balance comes from CreditsContext

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
          tooltip: `Low credits warning! Only ${creditsBalance.toLocaleString('en-IN')} sq.in remaining.`
        };
      case "warning":
        return {
          className: "bg-orange-500 hover:bg-orange-600 text-white border-orange-600",
          icon: <AlertTriangle className="w-4 h-4 mr-1" />,
          tooltip: `Running low on credits. ${creditsBalance.toLocaleString('en-IN')} sq.in remaining.`
        };
      default:
        return {
          className: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700",
          icon: null,
          tooltip: `You have ${creditsBalance.toLocaleString('en-IN')} sq.in available.`
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
                  Credits: {creditsBalance.toLocaleString('en-IN')} sq.in
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{badgeConfig.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User Email */}
          <div className="text-sm text-gray-600">
            <span className="font-medium">{user?.email}</span>
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
