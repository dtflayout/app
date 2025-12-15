import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useOutseta } from "@/contexts/OutsetaContext";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, CheckCircle2 } from "lucide-react";

const SignupPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useOutseta();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    if (user) {
      navigate("/app");
    }
  }, [user, navigate]);

  useEffect(() => {
    // Handle successful signup - set initial credits
    const handleSignup = async () => {
      console.log("Signup event triggered");

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
  }, [navigate, refreshUser, toast]);

  return (
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

      {/* Centered Signup Card */}
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Signup Card with Border Beam */}
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
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <UserPlus className="w-7 h-7 text-slate-600" />
                </div>
              </div>

              {/* Outseta auth widget embedded here */}
              <div className="overflow-hidden">
                <div
                  data-o-auth="1"
                  data-mode="embed"
                  data-widget-mode="register"
                  data-plan-uid="rmk5109g"
                  className="w-full"
                ></div>
              </div>

              {/* Benefits list */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mt-4 mb-4 border border-emerald-100">
                <ul className="space-y-2">
                  <li className="flex items-center gap-3 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-medium">10,000 free credits to get started</span>
                  </li>
                  <li className="flex items-center gap-3 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-medium">High-quality 150 DPI & 300 DPI exports</span>
                  </li>
                  <li className="flex items-center gap-3 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-medium">Access to tools like Background Remover, Image Enhancer & Trimmer</span>
                  </li>
                </ul>
              </div>

              {/* Footer link */}
              <p className="text-center text-slate-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-slate-900 font-semibold hover:text-slate-700 transition-colors underline underline-offset-2"
                >
                  Sign in
                </Link>
              </p>
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
  );
};

export default SignupPage;
