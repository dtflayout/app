import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, AlertCircle, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreditWarningBannerProps {
  credits: number;
}

export const CreditWarningBanner: React.FC<CreditWarningBannerProps> = ({ credits }) => {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if banner was dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('creditWarningDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('creditWarningDismissed', 'true');
  };

  const handleViewPlans = () => {
    // TODO: Update this to /pricing once that page is created
    window.alert('Pricing page coming soon! For now, please contact support to purchase more credits.');
  };

  // Determine warning level and config
  const getWarningConfig = () => {
    if (credits === 0) {
      return {
        level: "critical",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-900",
        icon: <Ban className="w-5 h-5 text-red-600" />,
        title: "Out of credits!",
        message: "Purchase more credits to continue generating layouts.",
        buttonText: "Buy Credits Now",
        buttonClass: "bg-red-600 hover:bg-red-700 text-white",
        canDismiss: false,
      };
    }

    if (credits <= 2300) {
      return {
        level: "urgent",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-900",
        icon: <AlertCircle className="w-5 h-5 text-red-600" />,
        title: "Almost out of credits!",
        message: `Only ${credits.toLocaleString()} sq.in remaining. Purchase more to continue.`,
        buttonText: "Buy Credits Now",
        buttonClass: "bg-red-600 hover:bg-red-700 text-white",
        canDismiss: false,
      };
    }

    if (credits < 6900) {
      return {
        level: "warning",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        textColor: "text-orange-900",
        icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
        title: "Running low on credits!",
        message: `You have ${credits.toLocaleString()} sq.in remaining. Consider purchasing more soon.`,
        buttonText: "View Plans",
        buttonClass: "bg-orange-600 hover:bg-orange-700 text-white",
        canDismiss: true,
      };
    }

    return null; // No warning needed
  };

  const config = getWarningConfig();

  // Don't show if credits are sufficient or if dismissed
  if (!config || (isDismissed && config.canDismiss)) {
    return null;
  }

  return (
    <div className={`${config.bgColor} border-2 ${config.borderColor} rounded-lg p-4 mb-6 animate-fade-in`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${config.textColor} mb-1`}>
            {config.title}
          </h3>
          <p className={`text-sm ${config.textColor} mb-3`}>
            {config.message}
          </p>
          <Button
            onClick={handleViewPlans}
            size="sm"
            className={config.buttonClass}
          >
            {config.buttonText}
          </Button>
        </div>

        {/* Dismiss button (only for dismissible warnings) */}
        {config.canDismiss && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-1 rounded hover:bg-orange-100 ${config.textColor} transition-colors`}
            aria-label="Dismiss warning"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
