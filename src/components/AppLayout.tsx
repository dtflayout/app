import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#F7F7F5] relative">
      <AppSidebar />

      {/* Main content area - margin adjusts for collapsed sidebar (76px = 52px sidebar + 2*12px margins) */}
      <div className="lg:ml-[76px] transition-all duration-300 ease-in-out relative z-10">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};
