import { supabase } from './supabaseClient';

export type UsageSource = 'standalone' | 'website_integration' | 'quick_store';

export interface UsageLogData {
  user_id: string;
  user_email: string;
  sq_inches_used: number;
  sheet_width: number;
  sheet_height: number;
  image_count: number;
  credits_before: number;
  credits_after: number;
  error_message?: string | null;
  source?: UsageSource;
  design_code?: string | null;
}

export interface UsageLogRecord extends UsageLogData {
  id: string;
  created_at: string;
  source: UsageSource;
  design_code: string | null;
}

export interface UsageStats {
  totalGenerations: number;
  totalSqInchesUsed: number;
  averagePerGeneration: number;
}

/**
 * Log a sheet generation event to the usage_logs table
 * @param data - Usage log data to insert
 * @returns Success status and optional error message
 */
export async function logSheetGeneration(
  data: UsageLogData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('usage_logs')
      .insert([data]);

    if (error) {
      console.error('Error logging usage to Supabase:', error);
      return {
        success: false,
        error: error.message || 'Failed to log usage'
      };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Exception while logging usage:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Log a failed sheet generation attempt
 * @param data - Partial usage log data with error message
 * @returns Success status and optional error message
 */
export async function logSheetGenerationError(
  data: {
    user_id: string;
    user_email: string;
    error_message: string;
    sq_inches_used?: number;
    sheet_width?: number;
    sheet_height?: number;
    image_count?: number;
    credits_before?: number;
    credits_after?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const logData: UsageLogData = {
      user_id: data.user_id,
      user_email: data.user_email,
      sq_inches_used: data.sq_inches_used ?? 0,
      sheet_width: data.sheet_width ?? 0,
      sheet_height: data.sheet_height ?? 0,
      image_count: data.image_count ?? 0,
      credits_before: data.credits_before ?? 0,
      credits_after: data.credits_after ?? data.credits_before ?? 0, // Same as before (no deduction)
      error_message: data.error_message,
    };

    const { error } = await supabase
      .from('usage_logs')
      .insert([logData]);

    if (error) {
      console.error('Error logging error to Supabase:', error);
      return {
        success: false,
        error: error.message || 'Failed to log error'
      };
    }

    console.log('[UsageLogger] Error logged:', data.error_message);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Exception while logging error:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Fetch all usage logs for a specific user
 * @param userEmail - The user's email address
 * @returns Array of usage log records
 */
export async function getUserLogs(
  userEmail: string
): Promise<{ success: boolean; data?: UsageLogRecord[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user logs from Supabase:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch logs'
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Exception while fetching user logs:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Calculate usage statistics for a user
 * @param logs - Array of usage log records
 * @returns Usage statistics
 */
export function calculateUsageStats(logs: UsageLogRecord[]): UsageStats {
  if (logs.length === 0) {
    return {
      totalGenerations: 0,
      totalSqInchesUsed: 0,
      averagePerGeneration: 0
    };
  }

  const totalSqInchesUsed = logs.reduce((sum, log) => sum + log.sq_inches_used, 0);

  return {
    totalGenerations: logs.length,
    totalSqInchesUsed,
    averagePerGeneration: totalSqInchesUsed / logs.length
  };
}
