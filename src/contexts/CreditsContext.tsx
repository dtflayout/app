import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabaseClient";

const FREE_TRIAL_CREDITS = 10000;

interface CreditsContextType {
  credits: number;
  freeTrialClaimed: boolean;
  isLoading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  deductCredits: (amount: number, description?: string) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
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
  const { user, isLoading: authLoading } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [freeTrialClaimed, setFreeTrialClaimed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch credits for the logged-in user
  const refreshCredits = useCallback(async () => {
    if (!user) {
      console.log("[Credits] No user logged in, setting credits to 0");
      setCredits(0);
      setFreeTrialClaimed(false);
      setIsLoading(false);
      return;
    }

    console.log("[Credits] Refreshing credits for user");
    setIsLoading(true);
    setError(null);

    try {
      // Try to get existing credits record
      const { data, error: fetchError } = await supabase
        .from("credits")
        .select("balance, free_trial_claimed")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = no rows returned (might happen if trigger didn't fire)
        console.error("[Credits] Fetch error:", fetchError);
        setError(fetchError.message);
        setCredits(0);
        setFreeTrialClaimed(false);
        setIsLoading(false);
        return;
      }

      if (data) {
        // User has credits record
        console.log("[Credits] Credits loaded:", data.balance, "freeTrialClaimed:", data.free_trial_claimed);
        setCredits(data.balance ?? 0);
        setFreeTrialClaimed(data.free_trial_claimed ?? false);
      } else {
        // No credits record found - this shouldn't happen with our trigger
        // But just in case, create one
        console.log("[Credits] No credits record found, creating one");
        
        const { error: insertError } = await supabase
          .from("credits")
          .insert({
            user_id: user.id,
            email: user.email,
            balance: 0,
            free_trial_claimed: false,
          });

        if (insertError) {
          console.error("[Credits] Insert error:", insertError);
          setError(insertError.message);
        }

        setCredits(0);
        setFreeTrialClaimed(false);
      }
    } catch (err: any) {
      console.error("[Credits] Exception:", err);
      setError(err.message);
      setCredits(0);
      setFreeTrialClaimed(false);
    }

    setIsLoading(false);
  }, [user]);

  // Deduct credits from the user's balance
  const deductCredits = useCallback(
    async (
      amount: number,
      description: string = "Sheet generation"
    ): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
      if (!user) {
        return { success: false, error: "User not logged in" };
      }

      if (credits < amount) {
        return { success: false, error: "Insufficient credits" };
      }

      console.log("[Credits] Deducting", amount, "credits");

      try {
        const newBalance = credits - amount;

        // Update the balance
        const { error: updateError } = await supabase
          .from("credits")
          .update({ balance: newBalance })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("[Credits] Update error:", updateError);
          return { success: false, error: updateError.message };
        }

        // Log the transaction
        const { error: txError } = await supabase
          .from("credit_transactions")
          .insert({
            user_id: user.id,
            type: "deduction",
            amount: -amount,
            balance_after: newBalance,
            description: description,
          });

        if (txError) {
          console.error("[Credits] Transaction log error:", txError);
          // Don't fail the whole operation for logging error
        }

        setCredits(newBalance);
        console.log("[Credits] Deduction successful. New balance:", newBalance);
        return { success: true, newBalance };
      } catch (err: any) {
        console.error("[Credits] Exception:", err);
        return { success: false, error: err.message };
      }
    },
    [user, credits]
  );

  // Claim free trial credits
  const claimFreeTrial = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "User not logged in" };
    }

    if (freeTrialClaimed) {
      return { success: false, error: "Free trial already claimed" };
    }

    console.log("[Credits] Claiming free trial credits");

    try {
      const newBalance = credits + FREE_TRIAL_CREDITS;

      // Update balance and mark free trial as claimed
      const { error: updateError } = await supabase
        .from("credits")
        .update({
          balance: newBalance,
          free_trial_claimed: true,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("[Credits] Update error:", updateError);
        return { success: false, error: updateError.message };
      }

      // Log the transaction
      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: user.id,
          type: "free_trial",
          amount: FREE_TRIAL_CREDITS,
          balance_after: newBalance,
          description: "Welcome bonus - Free trial credits",
        });

      if (txError) {
        console.error("[Credits] Transaction log error:", txError);
      }

      setCredits(newBalance);
      setFreeTrialClaimed(true);
      console.log("[Credits] Free trial claimed. New balance:", newBalance);
      return { success: true };
    } catch (err: any) {
      console.error("[Credits] Exception:", err);
      return { success: false, error: err.message };
    }
  }, [user, credits, freeTrialClaimed]);

  // Load credits when user changes
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        refreshCredits();
      } else {
        setCredits(0);
        setFreeTrialClaimed(false);
        setIsLoading(false);
      }
    }
  }, [user, authLoading, refreshCredits]);

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