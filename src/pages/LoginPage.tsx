import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
    background: linear-gradient(to right, #4338CA, #4F46E5) !important;
    background-color: #4338CA !important;
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
    background: linear-gradient(to right, #3730A3, #0f766e) !important;
    background-color: #3730A3 !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  }
`;

const LoginPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Check if user is already authenticated
    if (user) {
      navigate("/app");
    }
  }, [user, navigate]);

  // Note: LoginPage uses legacy Outseta widget. Consider migrating to AuthPage.tsx which uses Supabase auth.
  // Removed Outseta-specific event listeners and refreshUser calls.

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

        {/* Centered Login Card */}
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg">
            {/* Login Card with Border Beam */}
            <div className="relative bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">

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
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <LogIn className="w-7 h-7 text-gray-600" />
                  </div>
                </div>

                {/* Header */}
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome back
                  </h1>
                  <p className="text-gray-500">Sign in to your account to continue</p>
                </div>

                {/* Outseta auth widget embedded here */}
                <div className="overflow-hidden">
                  <div
                    data-o-auth="1"
                    data-mode="embed"
                    data-widget-mode="login"
                    className="w-full min-h-[280px]"
                  ></div>
                </div>

                {/* Footer link */}
                <p className="text-center mt-1 text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-gray-900 font-semibold hover:text-gray-700 transition-colors underline underline-offset-2"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>

            {/* Back to home - outside card */}
            <p className="text-center mt-6">
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
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

export default LoginPage;
