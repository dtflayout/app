import { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useOutseta } from "@/contexts/OutsetaContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

const SignupPage = () => {
  const navigate = useNavigate();
  const { outseta, user, refreshUser } = useOutseta();
  const { toast } = useToast();
  const widgetInitialized = useRef(false);

  useEffect(() => {
    // Check if user is already authenticated
    if (user) {
      navigate("/app");
    }
  }, [user, navigate]);

  useEffect(() => {
    // Initialize Outseta auth widget in embedded mode - register only
    if (outseta && !widgetInitialized.current) {
      widgetInitialized.current = true;

      // Small delay to ensure DOM is ready
      setTimeout(() => {
        outseta.auth.open({
          mode: 'embed',
          selector: '#outseta-signup-embed',
          widgetMode: 'register',
          authenticationCallbackUrl: window.location.origin + "/app",
          planUid: 'rmk5109g', // Free Trial plan
        });
      }, 100);
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

    // Listen for signup event (fires after registration completes)
    window.addEventListener("signup", handleSignup);

    return () => {
      window.removeEventListener("signup", handleSignup);
    };
  }, [outseta, navigate, refreshUser, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50/50 via-white to-white py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <span className="text-white font-bold text-lg">DC</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            DTF Collage Creator
          </span>
        </Link>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Create your account
          </h1>
          <p className="text-lg text-slate-600">Start creating print-ready collages today</p>
        </div>

        {/* Benefits list */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-6 border border-emerald-100">
          <ul className="space-y-2">
            <li className="flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="text-base font-medium">700 free credits to get started</span>
            </li>
            <li className="flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="text-base font-medium">High-quality 150 DPI exports</span>
            </li>
            <li className="flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="text-base font-medium">No credit card required</span>
            </li>
          </ul>
        </div>

        {/* Outseta auth widget embedded here */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div id="outseta-signup-embed" className="min-h-[380px] flex items-center justify-center">
            {/* Loading state while widget initializes */}
            <div className="text-center py-12">
              <Loader2 className="animate-spin w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-500">Loading...</p>
            </div>
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center mt-8 text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>

        {/* Back to home */}
        <p className="text-center mt-4">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            &larr; Back to home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
