import MarketingLayout from "@/components/marketing/MarketingLayout";

const TermsConditions = () => {
  const terms = [
    "Our tool generates print-ready DTF (Direct-to-Film) sheets based on uploaded images.",
    "The user is responsible for ensuring all uploaded content is owned by them or licensed for use.",
    "We are not liable for print errors caused by poor-quality images, incorrect size inputs, or wrong DPI selection by the user.",
    "Exported sheets are final and cannot be modified after generation.",
    "Subscription plans, if purchased, are non-transferable and linked to one account only.",
    "Sheet usage limits, sizes, or features may change based on the selected plan.",
    "Reselling output files is allowed only for personal business printing, but resale of the SaaS tool itself is prohibited.",
    "We reserve the right to suspend accounts that misuse the service.",
    "Continued use means acceptance of updates to these terms.",
  ];

  return (
    <MarketingLayout>
      {/* Subtle gradient background */}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-indigo-50/30">
        <div className="container max-w-4xl mx-auto px-6 py-20 lg:py-28">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Terms & Conditions
            </h1>
            <p className="text-lg text-gray-600">
              Welcome to our platform. By using our service, you agree to the following:
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 lg:p-12">
            <ol className="space-y-6">
              {terms.map((term, index) => (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 leading-relaxed pt-1">
                    {term}
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

export default TermsConditions;
