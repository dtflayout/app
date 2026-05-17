/**
 * OrderAutomation.tsx — dashboard "Coming Soon" page.
 * Lives at /app/order-automation (printer dashboard, ProtectedRoute).
 *
 * The page body is shared with the marketing-site version
 * (src/pages/marketing/OrderAutomation.tsx) — both render
 * <OrderAutomationContent /> so the two pages stay visually identical.
 * This file is just the dashboard chrome (sidebar via AppLayout).
 */
import { AppLayout } from "@/components/AppLayout";
import { OrderAutomationContent } from "@/components/order-automation";

const OrderAutomation = () => (
  <AppLayout>
    <OrderAutomationContent pageContext="dashboard" />
  </AppLayout>
);

export default OrderAutomation;
