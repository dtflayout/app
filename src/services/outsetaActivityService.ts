/**
 * Outseta Custom Activity Service
 *
 * Posts custom activities to Outseta to trigger email campaigns.
 * Activities are sent via our serverless API endpoint which handles Outseta authentication.
 */

export type OutsetaActivityType =
  | 'payment_successful'
  | 'invoice_created'
  | 'low_credits';

export interface ActivityMetadata {
  // Payment activities
  amount?: number;
  planName?: string;
  creditsAdded?: number;
  transactionId?: string;
  // Low credits activity
  currentBalance?: number;
}

export interface PostActivityParams {
  email: string;
  accountUid?: string; // Account UID for direct posting (preferred)
  activityType: OutsetaActivityType;
  metadata?: ActivityMetadata;
}

export interface PostActivityResponse {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Post a custom activity to Outseta for a user.
 * This triggers email campaigns configured in Outseta based on the activity type.
 *
 * @param params - The activity parameters
 * @returns Promise with success status and optional error
 */
export async function postOutsetaActivity(
  params: PostActivityParams
): Promise<PostActivityResponse> {
  const { email, accountUid, activityType, metadata } = params;

  console.log(`[OutsetaActivity] Posting activity: ${activityType} for ${email}`, accountUid ? `(Account: ${accountUid})` : '');

  try {
    const response = await fetch('/api/outseta-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        accountUid,
        activityType,
        metadata: metadata || {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[OutsetaActivity] Failed to post ${activityType}:`, data.error);
      return {
        success: false,
        error: data.error || `Failed to post activity: ${response.status}`,
      };
    }

    console.log(`[OutsetaActivity] Successfully posted ${activityType}`);
    return {
      success: true,
      data,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[OutsetaActivity] Exception posting ${activityType}:`, errorMessage);
    return {
      success: false,
      error: `Network error: ${errorMessage}`,
    };
  }
}

/**
 * Post payment successful activity
 */
export async function postPaymentSuccessfulActivity(
  email: string,
  metadata: {
    amount: number;
    planName: string;
    creditsAdded: number;
    transactionId: string;
  }
): Promise<PostActivityResponse> {
  return postOutsetaActivity({
    email,
    activityType: 'payment_successful',
    metadata,
  });
}

/**
 * Post invoice created activity
 */
export async function postInvoiceCreatedActivity(
  email: string,
  metadata: {
    amount: number;
    planName: string;
    creditsAdded: number;
    transactionId: string;
  }
): Promise<PostActivityResponse> {
  return postOutsetaActivity({
    email,
    activityType: 'invoice_created',
    metadata,
  });
}

/**
 * Post low credits alert activity
 */
export async function postLowCreditsActivity(
  email: string,
  currentBalance: number,
  accountUid?: string
): Promise<PostActivityResponse> {
  return postOutsetaActivity({
    email,
    accountUid,
    activityType: 'low_credits',
    metadata: { currentBalance },
  });
}
