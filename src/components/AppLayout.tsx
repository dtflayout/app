import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-100/50 via-white to-slate-100">
      <AppSidebar />

      {/* Main content area - margin adjusts for collapsed sidebar (70px) */}
      <div className="lg:ml-[70px] transition-all duration-300 ease-in-out">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};
