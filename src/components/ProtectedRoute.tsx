import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  console.log("[ProtectedRoute] Auth state:", { user: user?.email, isLoading });

  // Still checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50/50 via-white to-white">
        <div className="text-center">
          <Loader2 className="animate-spin w-12 h-12 text-indigo-500 mx-auto" />
          <p className="mt-6 text-2xl font-bold text-gray-900">Loading...</p>
          <p className="mt-2 text-lg text-gray-500">Checking authentication</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to auth page
  if (!user) {
    console.log("[ProtectedRoute] No user found - redirecting to auth");
    return <Navigate to="/auth" replace />;
  }

  // Authenticated - show the protected content
  console.log("[ProtectedRoute] User authenticated - showing protected content");
  return <>{children}</>;
};