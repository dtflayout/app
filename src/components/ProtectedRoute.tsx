import { Navigate, useLocation } from "react-router-dom";
import { useOutseta } from "@/contexts/OutsetaContext";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useOutseta();
  const location = useLocation();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    console.log("[ProtectedRoute] Auth state:", { user, isLoading });

    // Check for access token in URL - if present, we just logged in
    const urlParams = new URLSearchParams(location.search);
    const hasAccessToken = urlParams.has('access_token');

    if (hasAccessToken) {
      console.log("[ProtectedRoute] Access token detected in URL");
    }

    // Set timeout to stop showing loading after 3 seconds
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn("[ProtectedRoute] Auth check timeout - showing timeout message");
        setShowTimeout(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, isLoading, location]);

  // Still checking authentication
  if (isLoading && !showTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
          <p className="mt-2 text-xs text-gray-400">Checking authentication</p>
        </div>
      </div>
    );
  }

  // Timeout occurred - check for access token in URL
  if (showTimeout) {
    const urlParams = new URLSearchParams(location.search);
    const hasAccessToken = urlParams.has('access_token');

    if (hasAccessToken) {
      console.log("[ProtectedRoute] Timeout but access token present - allowing access");
      // Remove token from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      return <>{children}</>;
    }

    console.log("[ProtectedRoute] Timeout with no access token - redirecting to auth");
    return <Navigate to="/auth" replace />;
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
