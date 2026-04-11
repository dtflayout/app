import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Layers,
  Globe,
  Store,
  Zap,
  CheckCircle2,
  Mail,
} from "lucide-react";

// ─── Aurora Background ─────────────────────────────────────────────────────────

const AuroraBackground = () => {
  useEffect(() => {
    const id = "aurora-bg-css";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        @keyframes aBlob1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(180px, 120px) scale(1.2); }
          66% { transform: translate(-80px, 180px) scale(0.85); }
        }
        @keyframes aBlob2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-160px, -120px) scale(1.15); }
          66% { transform: translate(-200px, 60px) scale(0.9); }
        }
        @keyframes aBlob3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          25% { transform: translate(120px, -100px) scale(1.2); }
          50% { transform: translate(-100px, -150px) scale(0.85); }
          75% { transform: translate(-140px, 80px) scale(1.1); }
        }
        .aurora-blob-1 { animation: aBlob1 4s ease-in-out infinite; }
        .aurora-blob-2 { animation: aBlob2 5s ease-in-out infinite; }
        .aurora-blob-3 { animation: aBlob3 6s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute inset-0" style={{ background: "#f5f3ff" }} />
      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.4) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div
        className="aurora-blob-1"
        style={{
          position: "absolute", width: 500, height: 500, top: "-10%", left: "-5%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="aurora-blob-2"
        style={{
          position: "absolute", width: 450, height: 450, bottom: "-10%", right: "-5%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, transparent 70%)",
          filter: "blur(35px)",
        }}
      />
      <div
        className="aurora-blob-3"
        style={{
          position: "absolute", width: 400, height: 400, top: "25%", left: "25%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,181,253,0.35) 0%, transparent 70%)",
          filter: "blur(35px)",
        }}
      />
    </div>
  );
};

// ─── Auth Page ────────────────────────────────────────────────────────────────

// Inject animation CSS
const AUTH_ANIM_CSS = `
  @keyframes orbFloat1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(60px, 40px) scale(1.1); }
    50% { transform: translate(20px, 80px) scale(0.95); }
    75% { transform: translate(-40px, 30px) scale(1.05); }
  }
  @keyframes orbFloat2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(-50px, 60px) scale(1.08); }
    50% { transform: translate(-80px, 20px) scale(0.92); }
    75% { transform: translate(-20px, -40px) scale(1.03); }
  }
  @keyframes orbFloat3 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(70px, -30px) scale(1.12); }
    66% { transform: translate(-30px, -60px) scale(0.9); }
  }
  @keyframes gridDrift {
    0% { transform: translate(0, 0); }
    100% { transform: translate(60px, 60px); }
  }
  .auth-orb-1 { animation: orbFloat1 8s ease-in-out infinite; }
  .auth-orb-2 { animation: orbFloat2 10s ease-in-out infinite; }
  .auth-orb-3 { animation: orbFloat3 7s ease-in-out infinite; }
  .auth-grid-drift { animation: gridDrift 8s linear infinite; }
`;

const AuthPage = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname !== "/signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setForgotSent(true);
    }
    setForgotLoading(false);
  };

  // Inject animation styles
  useEffect(() => {
    const id = "auth-anim-css";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = AUTH_ANIM_CSS;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (isLogin) {
      const result = await signIn(email, password);
      if (result.success) {
        navigate("/app/dashboard");
      } else {
        setError(result.error || "Login failed");
      }
    } else {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setIsLoading(false);
        return;
      }

      const result = await signUp(email, password, fullName);
      if (result.success) {
        setSuccess(
          "Account created! Please check your email to confirm your account."
        );
        setEmail("");
        setPassword("");
        setFullName("");
      } else {
        setError(result.error || "Signup failed");
      }
    }

    setIsLoading(false);
  };

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 text-gray-900 rounded-xl text-sm bg-gray-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-gray-400";

  const features = [
    {
      icon: <Layers className="w-5 h-5" />,
      title: "Gang Sheet Builder",
      desc: "Auto-layout designs at 150 or 300 DPI with zero material waste.",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Website Integration",
      desc: "Embed the builder on your Shopify store. Customers build their own sheets.",
    },
    {
      icon: <Store className="w-5 h-5" />,
      title: "Quick Store",
      desc: "Launch a branded storefront in minutes — no code needed.",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Image Tools",
      desc: "Trim, enhance, remove backgrounds — all built in.",
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ━━━ Left Panel — Hero with animated effects ━━━ */}
      <div
        className="hidden lg:flex lg:w-[42%] relative overflow-hidden flex-col justify-center p-12"
        style={{
          background:
            "linear-gradient(160deg, #0F0D2E 0%, #1E1B4B 35%, #312E81 65%, #4338CA 100%)",
          borderRadius: "0 30px 30px 0",
        }}
      >
        {/* Animated grid mesh — matches hero */}
        <div
          className="auth-grid-drift"
          style={{
            position: "absolute",
            inset: "-50%",
            width: "200%",
            height: "200%",
            opacity: 0.18,
            backgroundImage: `
              linear-gradient(rgba(165,180,252,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(165,180,252,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />

        {/* Floating light orbs — animated spotlights */}
        <div
          className="auth-orb-1"
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)",
            top: "-15%",
            left: "-10%",
            filter: "blur(40px)",
          }}
        />
        <div
          className="auth-orb-2"
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)",
            top: "15%",
            right: "-12%",
            filter: "blur(30px)",
          }}
        />
        <div
          className="auth-orb-3"
          style={{
            position: "absolute",
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(165,180,252,0.35) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)",
            bottom: "5%",
            left: "25%",
            filter: "blur(35px)",
          }}
        />


        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2.5 mb-8">
            <img
              src="/DTF-Layout-WHITE-logo-text.png"
              alt="DTF Layout"
              className="h-10"
            />
          </Link>

          {/* Headline */}
          <div className="max-w-lg">
            <h1 className="font-heading text-5xl xl:text-6xl font-extrabold text-white tracking-tight leading-[1.08]">
              The all-in-one
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #A5B4FC, #C4B5FD, #E0E7FF)",
                }}
              >
                DTF print platform
              </span>
            </h1>
            <p className="mt-6 text-indigo-200/70 text-xl leading-relaxed max-w-md">
              Build gang sheets, embed on your store, and launch a storefront —
              all from one dashboard.
            </p>
          </div>

          {/* Features — right after text */}
          <div className="grid grid-cols-2 gap-3 mt-10" style={{ maxWidth: "80%" }}>
            {features.map((f, i) => (
              <div
                key={i}
                className="group relative p-4 rounded-2xl border border-white/[0.08] transition-all duration-300 hover:border-white/[0.15] hover:translate-y-[-2px]"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${
                      ["rgba(129,140,248,0.25)", "rgba(52,211,153,0.25)", "rgba(251,146,60,0.25)", "rgba(167,139,250,0.25)"][i]
                    }, transparent)`,
                  }}
                >
                  <div className={[
                    "text-indigo-300",
                    "text-emerald-300",
                    "text-orange-300",
                    "text-violet-300",
                  ][i]}>
                    {f.icon}
                  </div>
                </div>
                <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
                <p className="text-xs text-indigo-300/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━ Right Panel — Auth Form ━━━ */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12 relative"
        style={{ backgroundColor: "#FAFAFA" }}
      >
        {/* Aurora background — soft animated gradient */}
        <AuroraBackground />

        <div className="w-full max-w-[420px] relative z-10 bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src="/logo.png"
                alt="DTF Layout"
                className="h-9"
              />
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="font-heading text-2xl font-extrabold text-gray-900 tracking-tight">
              {showForgotPassword
                ? "Reset your password"
                : isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {showForgotPassword
                ? "Enter your email and we'll send you a reset link"
                : isLogin
                  ? "Sign in to continue to your dashboard"
                  : "Get started with 20,000 sq.in free credits"}
            </p>
          </div>

          {/* ── Forgot Password View ── */}
          {showForgotPassword ? (
            <div className="space-y-4">
              {forgotSent ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Check your email</p>
                  <p className="text-sm text-gray-500 mb-6">
                    We sent a password reset link to <span className="font-medium text-gray-700">{forgotEmail}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotSent(false);
                      setForgotEmail("");
                    }}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className={inputClass}
                      placeholder="you@example.com"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full flex justify-center items-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_8px_28px_rgba(79,70,229,0.3)]"
                    style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send reset link
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setError("");
                      }}
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to sign in
                    </button>
                  </p>
                </form>
              )}
            </div>
          ) : (
          /* ── Main Auth Form ── */
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Google Sign In */}
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                setError("");
                setIsLoading(true);
                const result = await signInWithGoogle();
                if (!result.success) {
                  setError(result.error || "Google sign-in failed");
                  setIsLoading(false);
                }
              }}
              className="w-full flex justify-center items-center gap-3 py-3 px-6 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 text-gray-400 bg-white">or</span>
              </div>
            </div>

            {/* Full Name (Signup only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  placeholder="John Doe"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setForgotEmail(email);
                    setError("");
                  }}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_8px_28px_rgba(79,70,229,0.3)]"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : isLogin ? (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Toggle */}
            <p className="text-center text-sm text-gray-500 pt-2">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setSuccess("");
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>

            {/* Free Trial Info */}
            {!isLogin && (
              <div className="text-center pt-1">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-sm text-indigo-700 font-medium border border-indigo-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  20,000 sq.in free · No credit card required
                </span>
              </div>
            )}
          </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
