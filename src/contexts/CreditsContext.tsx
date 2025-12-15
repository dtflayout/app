import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useOutseta } from "./OutsetaContext";
import {
  getOrCreateUserCredits,
  deductCredits as deductCreditsService,
  shouldSendLowCreditsAlert,
  updateLowCreditAlertTimestamp,
} from "@/lib/creditsService";
import { postLowCreditsActivity } from "@/services/outsetaActivityService";

interface CreditsContextType {
  credits: number;
  freeTrialClaimed: boolean;
  isLoading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  deductCredits: (amount: number) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
}

const CreditsContext = createContext<CreditsContextType>({
  credits: 0,
  freeTrialClaimed: false,
  isLoading: true,
  error: null,
  refreshCredits: async () => {},
  deductCredits: async () => ({ success: false, error: "Context not initialized" }),
});

export const useCredits = () => {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return context;
};

interface CreditsProviderProps {
  children: ReactNode;
}

export const CreditsProvider = ({ children }: CreditsProviderProps) => {
  const { user, isLoading: outsetaLoading } = useOutseta();
  const [credits, setCredits] = useState<number>(0);
  const [freeTrialClaimed, setFreeTrialClaimed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user ID from Outseta - this is used as the key in Supabase
  const getUserId = useCallback(() => {
    return user?.Account?.Uid || user?.Uid || null;
  }, [user]);

  const getUserEmail = useCallback(() => {
    return user?.Email || null;
  }, [user]);

  // Fetch or create credits for the logged-in user
  const refreshCredits = useCallback(async () => {
    const userId = getUserId();
    const email = getUserEmail();

    if (!userId || !email) {
      console.log("[CreditsContext] No user logged in, setting credits to 0");
      setCredits(0);
      setFreeTrialClaimed(false);
      setIsLoading(false);
      return;
    }

    console.log("[CreditsContext] Refreshing credits for user:", userId);
    setIsLoading(true);
    setError(null);

    const result = await getOrCreateUserCredits(userId, email);

    if (result.success) {
      console.log("[CreditsContext] Credits loaded:", result.credits, "freeTrialClaimed:", result.freeTrialClaimed, result.isNewUser ? "(new user)" : "");
      setCredits(result.credits ?? 0);
      setFreeTrialClaimed(result.freeTrialClaimed ?? false);
    } else {
      console.error("[CreditsContext] Failed to load credits:", result.error);
      setError(result.error || "Failed to load credits");
      setCredits(0);
      setFreeTrialClaimed(false);
    }

    setIsLoading(false);
  }, [getUserId, getUserEmail]);

  // Deduct credits from the user's balance
  const deductCredits = useCallback(async (amount: number): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
    const userId = getUserId();
    const email = getUserEmail();

    if (!userId || !email) {
      return { success: false, error: "User not logged in" };
    }

    if (credits < amount) {
      return { success: false, error: "Insufficient credits" };
    }

    console.log("[CreditsContext] Deducting", amount, "credits");

    const result = await deductCreditsService(userId, amount, email);

    if (result.success && result.newBalance !== undefined) {
      setCredits(result.newBalance);
      console.log("[CreditsContext] Credits updated to:", result.newBalance);

      // Check if we should send a low credits alert
      const alertCheck = await shouldSendLowCreditsAlert(userId, result.newBalance);
      if (alertCheck.shouldSend) {
        console.log("[CreditsContext] Sending low credits alert...");

        // Send the alert (non-blocking)
        postLowCreditsActivity(email, result.newBalance)
          .then(async (activityResult) => {
            if (activityResult.success) {
              // Update the timestamp to prevent duplicate alerts
              await updateLowCreditAlertTimestamp(userId);
              console.log("[CreditsContext] Low credits alert sent successfully");
            } else {
              console.error("[CreditsContext] Failed to send low credits alert:", activityResult.error);
            }
          })
          .catch((err) => {
            console.error("[CreditsContext] Exception sending low credits alert:", err);
          });
      }
    }

    return result;
  }, [getUserId, getUserEmail, credits]);

  // Load credits when user changes
  useEffect(() => {
    if (!outsetaLoading) {
      if (user) {
        refreshCredits();
      } else {
        setCredits(0);
        setFreeTrialClaimed(false);
        setIsLoading(false);
      }
    }
  }, [user, outsetaLoading, refreshCredits]);

  const value = {
    credits,
    freeTrialClaimed,
    isLoading,
    error,
    refreshCredits,
    deductCredits,
  };

  return (
    <CreditsContext.Provider value={value}>
      {children}
    </CreditsContext.Provider>
  );
};
