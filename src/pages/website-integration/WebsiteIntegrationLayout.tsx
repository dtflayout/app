import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { getPrinter } from "@/services/printerService";
import { cn } from "@/lib/utils";
import { Store, Package, ShoppingCart, Settings2 } from "lucide-react";
import { FullPageSkeleton } from "@/components/Skeletons";

const tabs = [
  {
    label: "Store Setup",
    path: "/app/website-integration/store-setup",
    icon: Store,
  },
  {
    label: "Products",
    path: "/app/website-integration/products",
    icon: Package,
  },
  {
    label: "Orders",
    path: "/app/website-integration/orders",
    icon: ShoppingCart,
  },
  {
    label: "Builder Settings",
    path: "/app/website-integration/builder-settings",
    icon: Settings2,
  },
];

const WebsiteIntegrationLayout = () => {
  const { user } = useAuth();
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user?.id) { setLoading(false); return; }
      const result = await getPrinter(user.id);
      if (result.success && result.data) {
        setSetupCompleted(!!result.data.setup_completed);
      } else {
        setSetupCompleted(false);
      }
      setLoading(false);
    };
    check();
  }, [user?.id]);

  if (loading) {
    return (
      <AppLayout>
        <FullPageSkeleton />
      </AppLayout>
    );
  }

  // During wizard: no header, no tabs, no padding
  if (setupCompleted === false) {
    return (
      <AppLayout>
        <Outlet />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-extrabold text-gray-900 tracking-tight">Website Integration</h1>
          <p className="text-gray-500 mt-1">
            Connect your website and let customers design gang sheets directly on your store
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  cn(
                    "group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    isActive
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <tab.icon
                      className={cn(
                        "h-5 w-5",
                        isActive
                          ? "text-indigo-500"
                          : "text-gray-400 group-hover:text-gray-500"
                      )}
                    />
                    {tab.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Page Content */}
        <Outlet />
      </div>
    </AppLayout>
  );
};

export default WebsiteIntegrationLayout;
