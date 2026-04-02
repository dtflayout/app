/**
 * QS Builder Settings — Wrapper
 * 
 * Ensures a printer row exists for this QS user (required for builder settings
 * to be stored), then renders the shared BuilderSettings component.
 * 
 * Handles the edge case where a QS store was created before the auto-create
 * printer logic was added.
 */

import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ensurePrinterForQS } from '@/services/quickStoreService';
import { QuickStore } from '@/types/quickStore';
import BuilderSettings from '@/pages/website-integration/BuilderSettings';
import { FormSkeleton } from '@/components/Skeletons';

interface OutletContextType {
  store: QuickStore | null;
}

const QSBuilderSettings: React.FC = () => {
  const { user } = useAuth();
  const { store } = useOutletContext<OutletContextType>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ensure = async () => {
      if (!user?.id || !store) {
        setReady(true);
        return;
      }

      // Ensure printer row exists (idempotent — returns existing if already present)
      const result = await ensurePrinterForQS(
        user.id,
        store.slug,
        store.store_name,
        store.logo_url
      );

      if (!result.success) {
        console.error("[QSBuilderSettings] Failed to ensure printer:", result.error);
        setError(result.error || "Failed to initialize builder settings");
      }

      setReady(true);
    };

    ensure();
  }, [user?.id, store?.id]);

  if (!ready) {
    return <FormSkeleton fields={8} />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load builder settings: {error}</p>
      </div>
    );
  }

  // Render the shared BuilderSettings component
  // It loads printer + settings internally via getPrinter(user.id)
  return <BuilderSettings context="qs" />;
};

export default QSBuilderSettings;
