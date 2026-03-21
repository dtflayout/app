import MarketingLayout from "@/components/marketing/MarketingLayout";

const PrivacyPolicy = () => {
  const policies = [
    "We collect only necessary data such as name, email, sheet uploads, generated usage area, and billing details.",
    "Uploaded files are processed within the browser and are not publicly shared.",
    "We do not sell or distribute your data to third parties.",
    "Data may be stored securely for improving the service and tracking sheet usage under subscription plans.",
    "Payment transactions are handled by authorized payment partners — we do not store card details.",
    "You may request deletion of your account and data anytime.",
    "We use cookies only for authentication and analytics to enhance user experience.",
  ];

  return (
    <MarketingLayout>
      {/* Subtle gradient background */}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-indigo-50/30">
        <div className="container max-w-4xl mx-auto px-6 py-20 lg:py-28">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-600">
              Your privacy matters to us.
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 lg:p-12">
            <ol className="space-y-6">
              {policies.map((policy, index) => (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 leading-relaxed pt-1">
                    {policy}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Footer note */}
          <p className="text-center text-gray-500 text-sm mt-8">
            Last updated: November 2025
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
};

export default PrivacyPolicy;
