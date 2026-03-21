import MarketingLayout from "@/components/marketing/MarketingLayout";

const RefundPolicy = () => {
  const policies = [
    "Since our DTF sheets are automatically generated digital files, we do not offer refunds once a sheet is exported.",
    "Subscription plans can be cancelled anytime, but fees already paid are non-refundable.",
    "In case of accidental payment or duplicate plan purchase, you can request a refund within 24 hours if no sheets were generated or exported.",
    "We do not accept refund requests for dissatisfaction with design layout, color output, or image placement, as the tool works fully automatically.",
    "Contact support for genuine billing errors.",
  ];

  return (
    <MarketingLayout>
      {/* Subtle gradient background */}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-indigo-50/30">
        <div className="container max-w-4xl mx-auto px-6 py-20 lg:py-28">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Refund / Cancellation Policy
            </h1>
            <p className="text-lg text-gray-600">
              Please read carefully:
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

export default RefundPolicy;
