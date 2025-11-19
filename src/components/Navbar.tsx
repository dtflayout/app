import { useOutseta } from "@/contexts/OutsetaContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const Navbar = () => {
  const { user, logout: contextLogout } = useOutseta();
  const navigate = useNavigate();
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

  // Determine badge color based on credits
  const getCreditsBadgeVariant = () => {
    if (creditsBalance === 0) return "destructive"; // Red
    if (creditsBalance < 1000) return "secondary"; // Yellow/Orange (we'll style this)
    return "default"; // Normal
  };

  const getCreditsBadgeClass = () => {
    if (creditsBalance < 1000 && creditsBalance > 0) {
      return "bg-orange-500 hover:bg-orange-600 text-white";
    }
    return "";
  };

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">DTF Collage Creator</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Credits Display */}
          <Badge
            variant={getCreditsBadgeVariant()}
            className={`text-sm font-semibold px-3 py-1 ${getCreditsBadgeClass()}`}
          >
            Credits: {creditsBalance.toLocaleString()} sq.in
          </Badge>

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
