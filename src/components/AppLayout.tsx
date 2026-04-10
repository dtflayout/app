import { AppSidebar } from "./AppSidebar";
import { OnboardingModal } from "./OnboardingModal";
import { useAuth } from "@/contexts/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { profile } = useAuth();

  // Show onboarding modal if profile loaded and onboarding not completed
  const showOnboarding = profile && !profile.onboarding_completed;

  return (
    <div className="min-h-screen bg-[#F7F7F5] relative">
      {/* Soft Lavender Wash gradient overlay — fades from top into page bg */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(180deg, #EEF2FF 0%, #E8E4FB 12%, #F0EDF8 25%, #F5F4F6 38%, #F7F7F5 50%, transparent 50%)',
        }}
      />
      <AppSidebar />

      {/* Main content area - margin adjusts for collapsed sidebar (70px) */}
      <div className="lg:ml-[70px] transition-all duration-300 ease-in-out relative z-10">
        <main className="min-h-screen">
          {children}
        </main>
      </div>

      {/* Onboarding modal — blocks app until business details are provided */}
      {showOnboarding && <OnboardingModal />}
    </div>
  );
};
