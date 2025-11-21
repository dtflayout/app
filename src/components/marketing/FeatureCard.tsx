import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface FeatureCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  className?: string;
}

const FeatureCard = ({
  icon,
  title,
  description,
  className = "",
}: FeatureCardProps) => {
  return (
    <Card
      className={`group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-300 border-t-4 border-t-emerald-600 border-x border-b border-slate-100 ${className}`}
    >
      {icon && (
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
          <div className="transform group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </Card>
  );
};

export default FeatureCard;
