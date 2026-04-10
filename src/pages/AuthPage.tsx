import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (isLogin) {
      const result = await signIn(email, password);
      if (result.success) {
        console.log("[AuthPage] Login successful, navigating to /app");
        navigate("/builder-150");
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
        setSuccess("Account created! Please check your email to confirm your account.");
        setEmail("");
        setPassword("");
        setFullName("");
      } else {
        setError(result.error || "Signup failed");
      }
    }

    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0F0D2E 0%, #1E1B4B 40%, #312E81 70%, #4F46E5 100%)" }}
    >
      {/* Decorative orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-30 -top-40 -left-40"
        style={{ background: "radial-gradient(circle, rgba(129,140,248,0.4) 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-25 -bottom-32 -right-32"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, transparent 70%)", filter: "blur(50px)" }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <span className="font-heading font-bold text-xl text-white">DTF Layout</span>
          </Link>
          <h1 className="font-heading text-3xl font-extrabold text-white tracking-tight">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-indigo-200/70">
            {isLogin ? "Sign in to continue to your dashboard" : "Get started with 20,000 sq.in free credits"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-xl text-sm">
                {success}
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
              className="w-full flex justify-center items-center gap-3 py-3 px-6 rounded-full text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-gray-400">or</span>
              </div>
            </div>

            {/* Full Name (Signup only) */}
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                  placeholder="John Doe"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* Forgot Password */}
            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  onClick={() => alert("Forgot password feature coming soon!")}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-6 rounded-full text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(79,70,229,0.4)]"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : isLogin ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>

            {/* Toggle */}
            <p className="text-center text-sm text-gray-500">
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
              <div className="text-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-sm text-indigo-700 font-medium border border-indigo-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  20,000 sq.in free · No credit card required
                </span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
