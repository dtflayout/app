import { supabase } from './supabaseClient';

// Types
export type CreditType = 
  | 'free_trial' 
  | 'recharge' 
  | 'usage' 
  | 'manual_adjustment';

export interface CreditLedgerEntry {
  id: string;
  user_id: string;
  email: string;
  type: CreditType;
  amount: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

/**
 * Log a credit transaction to the ledger
 */
export async function logCreditTransaction(
  userId: string,
  email: string,
  type: CreditType,
  amount: number,
  balanceAfter: number,
  description?: string,
  referenceId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        email: email,
        type: type,
        amount: amount,
        balance_after: balanceAfter,
        description: description || null,
      });

    if (error) {
      console.error('Error logging credit transaction:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception logging credit transaction:', err);
    return { success: false, error: 'Failed to log transaction' };
  }
}

/**
 * Get credit ledger history for a user
 */
export async function getCreditLedger(
  userId: string,
  limit: number = 50
): Promise<CreditLedgerEntry[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching credit ledger:', error);
    return [];
  }

  return data || [];
}

/**
 * Get credit summary by type for a user
 */
export async function getCreditSummary(userId: string): Promise<{
  totalCredits: number;
  totalDebits: number;
  byType: Record<CreditType, number>;
}> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('type, amount')
    .eq('user_id', userId);

  if (error || !data) {
    return {
      totalCredits: 0,
      totalDebits: 0,
      byType: {} as Record<CreditType, number>,
    };
  }

  const summary = {
    totalCredits: 0,
    totalDebits: 0,
    byType: {} as Record<CreditType, number>,
  };

  data.forEach((entry) => {
    if (entry.amount > 0) {
      summary.totalCredits += entry.amount;
    } else {
      summary.totalDebits += Math.abs(entry.amount);
    }

    if (!summary.byType[entry.type as CreditType]) {
      summary.byType[entry.type as CreditType] = 0;
    }
    summary.byType[entry.type as CreditType] += entry.amount;
  });

  return summary;
}
