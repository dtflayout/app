import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useOutseta } from "@/contexts/OutsetaContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useOutseta();

  useEffect(() => {
    // Check if user is already authenticated
    if (user) {
      navigate("/app");
    }
  }, [user, navigate]);

  useEffect(() => {
    // Handle successful login - just redirect
    const handleLogin = async () => {
      console.log("Login event triggered");
      await refreshUser();
      navigate("/app");
    };

    // Listen for access token set event (fires after successful login)
    window.addEventListener("accessToken.set", handleLogin);

    return () => {
      window.removeEventListener("accessToken.set", handleLogin);
    };
  }, [navigate, refreshUser]);

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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Welcome back
          </h1>
          <p className="text-lg text-slate-600">Sign in to your account to continue</p>
        </div>

        {/* Outseta auth widget embedded here */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div
            data-o-auth="1"
            data-mode="embed"
            data-widget-mode="login"
            className="w-full min-h-[320px]"
          ></div>
        </div>

        {/* Footer link */}
        <p className="text-center mt-8 text-slate-600">
          Don't have an account?{" "}
          <Link to="/signup" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors underline-offset-2 hover:underline">
            Sign up for free
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

export default LoginPage;
