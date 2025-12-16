import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useOutseta } from "@/contexts/OutsetaContext";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";

// Custom styles to override Outseta widget button
const outsetaStyles = `
  .outseta-widget button,
  .outseta-widget input[type="submit"],
  [data-o-auth] button,
  [data-o-auth] button[type="submit"],
  [data-o-auth] .btn,
  [data-o-auth] .btn-primary,
  [data-o-auth] .o-btn,
  [data-o-auth] .o-btn-primary,
  .o-auth-module button,
  .o-auth-module .btn-primary {
    background: linear-gradient(to right, #059669, #0d9488) !important;
    background-color: #059669 !important;
    border: none !important;
    border-color: transparent !important;
    transition: all 0.2s ease !important;
  }
  .outseta-widget button:hover,
  .outseta-widget input[type="submit"]:hover,
  [data-o-auth] button:hover,
  [data-o-auth] button[type="submit"]:hover,
  [data-o-auth] .btn:hover,
  [data-o-auth] .btn-primary:hover,
  [data-o-auth] .o-btn:hover,
  [data-o-auth] .o-btn-primary:hover,
  .o-auth-module button:hover,
  .o-auth-module .btn-primary:hover {
    background: linear-gradient(to right, #047857, #0f766e) !important;
    background-color: #047857 !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  }
`;

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
    <>
      <style>{outsetaStyles}</style>
      <div
        className="min-h-screen relative"
        style={{
          background: `
            linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 30%, #ffffff 70%, #f0f9ff 100%)
          `
        }}
      >
        {/* Subtle cloud-like radial gradients */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 20%, rgba(186, 230, 253, 0.4) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 30%, rgba(186, 230, 253, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 70% 50% at 50% 80%, rgba(224, 242, 254, 0.3) 0%, transparent 50%)
            `
          }}
        />

        {/* Logo - Top Left */}
        <Link
          to="/"
          className="absolute top-6 left-6 z-10 group"
        >
          <img
            src="/logo.png"
            alt="DTF Layout"
            className="h-10 group-hover:scale-105 transition-all duration-300"
          />
        </Link>

        {/* Centered Auth Card */}
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg">
            {/* Auth Card with Border Beam */}
            <div className="relative bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">

              {/* First animated border beam - EMERALD GREEN */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div
                  className="absolute -inset-[100px] animate-border-beam"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(16, 185, 129, 0) 230deg, rgba(16, 185, 129, 0.9) 260deg, rgba(52, 211, 153, 1) 280deg, rgba(16, 185, 129, 0.9) 300deg, rgba(16, 185, 129, 0) 330deg, transparent 360deg)',
                    filter: 'blur(2px)',
                  }}
                />
              </div>

              {/* Second animated border beam - BLUE (delayed) */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div
                  className="absolute -inset-[100px] animate-border-beam-delayed"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(59, 130, 246, 0) 230deg, rgba(59, 130, 246, 0.9) 260deg, rgba(37, 99, 235, 1) 280deg, rgba(59, 130, 246, 0.9) 300deg, rgba(59, 130, 246, 0) 330deg, transparent 360deg)',
                    filter: 'blur(2px)',
                  }}
                />
              </div>

              {/* White card background mask */}
              <div className="absolute inset-[2px] bg-white rounded-3xl z-0"></div>

              {/* Card content */}
              <div className="relative z-10 p-8">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <LogIn className="w-7 h-7 text-slate-600" />
                  </div>
                </div>

                {/* Header */}
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    Welcome to DTF Layout
                  </h1>
                  <p className="text-slate-500">Sign in or create an account to continue</p>
                </div>

                {/* Outseta auth widget will render here */}
                <div id="outseta-auth-widget" className="min-h-[400px]">
                  {/* The Outseta widget will populate this area */}
                </div>
              </div>
            </div>

            {/* Back to home - outside card */}
            <p className="text-center mt-6">
              <Link
                to="/"
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                &larr; Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
