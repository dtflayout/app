import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOutseta } from "@/contexts/OutsetaContext";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const navigate = useNavigate();
  const { outseta, user, refreshUser } = useOutseta();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    if (user) {
      navigate("/app");
    }
  }, [user, navigate]);

  useEffect(() => {
    // Initialize Outseta auth widget in embedded mode
    if (outseta) {
      outseta.auth.open({
        mode: 'embed',
        selector: '#outseta-auth-widget',
        widgetMode: 'login|register',
        authenticationCallbackUrl: window.location.origin + "/app",
        planUid: 'rmk5109g', // Free Trial plan
      });
    }

    // Handle successful signup - set initial credits
    const handleSignup = async (data: any) => {
      console.log("Signup event triggered", data);

      try {
        // Get the newly created user
        if (window.Outseta) {
          const currentUser = await window.Outseta.getUser();

          if (currentUser) {
            // Update account with initial credits balance
            await currentUser.update({
              Account: {
                credits_balance: 700
              }
            });

            console.log("Credits initialized to 700");

            toast({
              title: "Welcome!",
              description: "Your account has been created with 700 free credits.",
            });
          }
        }

        // Refresh user data and redirect
        await refreshUser();
        navigate("/app");
      } catch (error) {
        console.error("Error initializing credits:", error);
        // Still redirect even if credits update fails
        await refreshUser();
        navigate("/app");
      }
    };

    // Handle successful login - just redirect
    const handleLogin = async () => {
      console.log("Login event triggered");
      await refreshUser();
      navigate("/app");
    };

    // Listen for signup event (fires after registration completes)
    window.addEventListener("signup", handleSignup);

    // Listen for access token set event (fires after successful login)
    window.addEventListener("accessToken.set", handleLogin);

    return () => {
      window.removeEventListener("signup", handleSignup);
      window.removeEventListener("accessToken.set", handleLogin);
      // Don't close in embed mode, just clean up
    };
  }, [outseta, navigate, refreshUser, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            DTF Print Collage Creator
          </h1>
          <p className="text-gray-600">Sign in or create an account to continue</p>
        </div>

        {/* Outseta auth widget will render here */}
        <div id="outseta-auth-widget" className="bg-white rounded-lg shadow-lg p-6 min-h-[400px]">
          {/* The Outseta widget will populate this area */}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
