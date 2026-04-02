import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5] relative overflow-hidden">
      {/* Subtle mesh gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.06) 0%, transparent 50%)",
        }}
      />
      <div className="text-center relative z-10">
        <div className="font-heading text-[120px] font-extrabold tracking-tighter leading-none bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          404
        </div>
        <h1 className="font-heading text-2xl font-bold text-gray-900 mt-2 mb-3">
          Page not found
        </h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-7 py-3 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(79,70,229,0.4)]"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
