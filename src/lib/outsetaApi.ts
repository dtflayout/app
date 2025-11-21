import { outsetaConfig } from './outsetaClient';

/**
 * TODO: SECURITY WARNING - For Production
 * This function exposes API credentials on the client side, which is acceptable for MVP testing
 * but NOT secure for production. Before launching:
 * 1. Move this function to a backend API endpoint
 * 2. Call the backend endpoint from the client instead
 * 3. Backend should handle Outseta API authentication securely
 */

/**
 * Update a user's credit balance in Outseta using REST API
 * @param accountId - The account UID from user.Account.Uid
 * @param newBalance - The new credit balance to set
 * @returns Object with success status, optional error message, and optional response data
 */
export async function updateAccountCredits(
  accountId: string,
  newBalance: number
): Promise<{ success: boolean; error?: string; data?: any }> {
  console.log('[Outseta API] Starting credit update...');
  console.log(`[Outseta API] Account ID: ${accountId}`);
  console.log(`[Outseta API] New Balance: ${newBalance}`);

  try {
    // Validate inputs
    if (!accountId) {
      const error = 'Account ID is required';
      console.error('[Outseta API] Validation error:', error);
      return { success: false, error };
    }

    if (typeof newBalance !== 'number' || newBalance < 0) {
      const error = 'New balance must be a non-negative number';
      console.error('[Outseta API] Validation error:', error);
      return { success: false, error };
    }

    // Construct the API endpoint
    const url = `https://${outsetaConfig.domain}/api/v1/crm/accounts/${accountId}`;
    console.log(`[Outseta API] Endpoint: ${url}`);

    // Debug: Check credentials are available
    console.log('[Outseta API] Credentials check:', {
      hasApiKey: !!outsetaConfig.apiKey,
      hasApiSecret: !!outsetaConfig.apiSecret,
      apiKeyLength: outsetaConfig.apiKey?.length || 0,
      apiSecretLength: outsetaConfig.apiSecret?.length || 0,
      apiKeyPreview: outsetaConfig.apiKey ? `${outsetaConfig.apiKey.substring(0, 8)}...${outsetaConfig.apiKey.substring(outsetaConfig.apiKey.length - 4)}` : 'MISSING',
    });

    // Create Basic Auth header: base64(apiKey:apiSecret)
    const credentials = `${outsetaConfig.apiKey}:${outsetaConfig.apiSecret}`;
    const base64Credentials = btoa(credentials);
    const authHeader = `Basic ${base64Credentials}`;

    console.log('[Outseta API] Auth header details:', {
      credentialsLength: credentials.length,
      base64Length: base64Credentials.length,
      base64Preview: `${base64Credentials.substring(0, 20)}...${base64Credentials.substring(base64Credentials.length - 10)}`,
    });

    // Prepare request body
    const requestBody = {
      CreditsBalance: newBalance,
    };

    console.log('[Outseta API] Request body:', requestBody);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    };

    console.log('[Outseta API] Request headers (sanitized):', {
      'Content-Type': headers['Content-Type'],
      'Authorization': `${authHeader.substring(0, 15)}...${authHeader.substring(authHeader.length - 10)}`,
    });

    // Make the API request
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log(`[Outseta API] Response status: ${response.status} ${response.statusText}`);

    // Log response headers
    console.log('[Outseta API] Response headers:', {
      'content-type': response.headers.get('content-type'),
      'www-authenticate': response.headers.get('www-authenticate'),
    });

    if (!response.ok) {
      let errorText: string;
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
        console.error('[Outseta API] Error response data:', errorData);
      } catch {
        errorText = await response.text();
        console.error('[Outseta API] Error response text:', errorText);
      }

      return {
        success: false,
        error: `Failed to update credits: ${response.status} ${response.statusText}. ${errorText}`,
      };
    }

    // Parse successful response
    const data = await response.json();
    console.log('[Outseta API] Credits updated successfully!');
    console.log('[Outseta API] Response data:', data);

    return {
      success: true,
      data,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Outseta API] Exception during credit update:', err);
    return {
      success: false,
      error: `Network or server error: ${errorMessage}`,
    };
  }
}

/**
 * Alternative method: Update credits using user's access token
 * This uses the token from the authenticated user session instead of API credentials
 */
export async function updateAccountCreditsWithUserToken(
  accountId: string,
  newBalance: number
): Promise<{ success: boolean; error?: string; data?: any }> {
  console.log('[Outseta API - Token Method] Starting credit update...');
  console.log(`[Outseta API - Token Method] Account ID: ${accountId}`);
  console.log(`[Outseta API - Token Method] New Balance: ${newBalance}`);

  try {
    // Get the user's access token from Outseta SDK
    const accessToken = window.Outseta?.getAccessToken?.();

    if (!accessToken) {
      const error = 'No access token found. User may not be authenticated.';
      console.error('[Outseta API - Token Method]', error);
      return { success: false, error };
    }

    console.log('[Outseta API - Token Method] Access token found:', {
      tokenLength: accessToken.length,
      tokenPreview: `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`,
    });

    // Construct the API endpoint
    const url = `https://${outsetaConfig.domain}/api/v1/crm/accounts/${accountId}`;
    console.log(`[Outseta API - Token Method] Endpoint: ${url}`);

    // Use Bearer token authentication
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };

    console.log('[Outseta API - Token Method] Using Bearer token authentication');

    const requestBody = {
      CreditsBalance: newBalance,
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log(`[Outseta API - Token Method] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorText: string;
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
        console.error('[Outseta API - Token Method] Error response data:', errorData);
      } catch {
        errorText = await response.text();
        console.error('[Outseta API - Token Method] Error response text:', errorText);
      }

      return {
        success: false,
        error: `Failed to update credits: ${response.status} ${response.statusText}. ${errorText}`,
      };
    }

    const data = await response.json();
    console.log('[Outseta API - Token Method] Credits updated successfully!');
    console.log('[Outseta API - Token Method] Response data:', data);

    return {
      success: true,
      data,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Outseta API - Token Method] Exception:', err);
    return {
      success: false,
      error: `Network or server error: ${errorMessage}`,
    };
  }
}

/**
 * Smart update function that tries multiple authentication methods
 * 1. First tries Basic Auth with API credentials
 * 2. Falls back to Bearer token if available
 *
 * TODO: CURRENTLY BLOCKED - BOTH AUTH METHODS RETURN 401
 * Issue: Outseta API endpoint /api/v1/crm/accounts/{id} appears to not support
 * updating custom properties (CreditsBalance) via PUT request
 *
 * Next steps to investigate:
 * 1. Check if there's a specific custom properties endpoint
 * 2. Contact Outseta support for correct API usage
 * 3. Consider alternative: use Outseta webhooks to sync credits
 * 4. Temporary workaround: Update UI state only (see CollageCreator.tsx)
 *
 * See TODO.md for full details
 */
export async function updateAccountCreditsWithFallback(
  accountId: string,
  newBalance: number
): Promise<{ success: boolean; error?: string; data?: any }> {
  console.log('[Outseta API - Smart Update] Trying Basic Auth first...');

  // Try Basic Auth first
  const basicAuthResult = await updateAccountCredits(accountId, newBalance);

  if (basicAuthResult.success) {
    console.log('[Outseta API - Smart Update] Basic Auth succeeded!');
    return basicAuthResult;
  }

  console.log('[Outseta API - Smart Update] Basic Auth failed, trying Bearer token...');

  // Fall back to Bearer token
  const tokenResult = await updateAccountCreditsWithUserToken(accountId, newBalance);

  if (tokenResult.success) {
    console.log('[Outseta API - Smart Update] Bearer token succeeded!');
    return tokenResult;
  }

  console.error('[Outseta API - Smart Update] Both methods failed');
  return {
    success: false,
    error: `Both authentication methods failed. Basic Auth: ${basicAuthResult.error}. Bearer Token: ${tokenResult.error}`,
  };
}

/**
 * NEW APPROACH: Update credits using Outseta SDK's user.update() method
 * This uses the client-side SDK directly instead of REST API calls
 * @param newBalance - The new credit balance to set
 * @returns Object with success status, optional error message, and optional response data
 */
export async function updateCreditsViaSDK(
  newBalance: number
): Promise<{ success: boolean; error?: string; data?: any }> {
  console.log('[Outseta SDK] Starting credit update via user.update()...');
  console.log(`[Outseta SDK] New Balance: ${newBalance}`);

  try {
    // Validate input
    if (typeof newBalance !== 'number' || newBalance < 0) {
      const error = 'New balance must be a non-negative number';
      console.error('[Outseta SDK] Validation error:', error);
      return { success: false, error };
    }

    // Get fresh user object
    if (!window.Outseta) {
      const error = 'Outseta SDK not loaded';
      console.error('[Outseta SDK]', error);
      return { success: false, error };
    }

    console.log('[Outseta SDK] Getting fresh user object...');
    const user = await window.Outseta.getUser();

    if (!user) {
      const error = 'No user found. User may not be authenticated.';
      console.error('[Outseta SDK]', error);
      return { success: false, error };
    }

    if (!user.Account) {
      const error = 'User has no Account object';
      console.error('[Outseta SDK]', error);
      return { success: false, error };
    }

    console.log('[Outseta SDK] Current user:', {
      email: user.Email,
      accountUid: user.Account.Uid,
      currentCredits: user.Account.CreditsBalance,
    });

    // Check if user has update method
    if (typeof user.update !== 'function') {
      const error = 'User object does not have update() method';
      console.error('[Outseta SDK]', error);
      return { success: false, error };
    }

    console.log('[Outseta SDK] user.update() method found!');

    // APPROACH 1: Try updating with nested Account object
    console.log('[Outseta SDK] Approach 1: Updating with nested Account.CreditsBalance...');
    const updatePayload1 = {
      Account: {
        CreditsBalance: newBalance,
      },
    };
    console.log('[Outseta SDK] Update payload:', JSON.stringify(updatePayload1, null, 2));

    try {
      const result = await user.update(updatePayload1);
      console.log('[Outseta SDK] Approach 1 SUCCESS!');
      console.log('[Outseta SDK] Update result:', result);

      // Verify the update
      const updatedUser = await window.Outseta.getUser();
      console.log('[Outseta SDK] New credits balance:', updatedUser?.Account?.CreditsBalance);

      return {
        success: true,
        data: {
          method: 'user.update({ Account: { CreditsBalance } })',
          result,
          newBalance: updatedUser?.Account?.CreditsBalance,
        },
      };
    } catch (error1) {
      console.log('[Outseta SDK] Approach 1 failed:', error1);

      // APPROACH 2: Try modifying user object directly then calling update
      console.log('[Outseta SDK] Approach 2: Modifying user object directly then calling update...');
      user.Account.CreditsBalance = newBalance;
      console.log('[Outseta SDK] Modified user.Account.CreditsBalance to:', newBalance);
      console.log('[Outseta SDK] Calling user.update(user)...');

      try {
        const result = await user.update(user);
        console.log('[Outseta SDK] Approach 2 SUCCESS!');
        console.log('[Outseta SDK] Update result:', result);

        // Verify the update
        const updatedUser = await window.Outseta.getUser();
        console.log('[Outseta SDK] New credits balance:', updatedUser?.Account?.CreditsBalance);

        return {
          success: true,
          data: {
            method: 'user.update(user) after modifying property',
            result,
            newBalance: updatedUser?.Account?.CreditsBalance,
          },
        };
      } catch (error2) {
        console.log('[Outseta SDK] Approach 2 failed:', error2);

        // APPROACH 3: Try calling update with no parameters
        console.log('[Outseta SDK] Approach 3: Calling user.update() with no params...');
        user.Account.CreditsBalance = newBalance;

        try {
          const result = await user.update();
          console.log('[Outseta SDK] Approach 3 SUCCESS!');
          console.log('[Outseta SDK] Update result:', result);

          // Verify the update
          const updatedUser = await window.Outseta.getUser();
          console.log('[Outseta SDK] New credits balance:', updatedUser?.Account?.CreditsBalance);

          return {
            success: true,
            data: {
              method: 'user.update() after modifying property',
              result,
              newBalance: updatedUser?.Account?.CreditsBalance,
            },
          };
        } catch (error3) {
          console.error('[Outseta SDK] All approaches failed');
          console.error('[Outseta SDK] Error 1:', error1);
          console.error('[Outseta SDK] Error 2:', error2);
          console.error('[Outseta SDK] Error 3:', error3);

          return {
            success: false,
            error: `All SDK update approaches failed. Errors: ${error1}, ${error2}, ${error3}`,
          };
        }
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Outseta SDK] Exception during credit update:', err);
    return {
      success: false,
      error: `SDK error: ${errorMessage}`,
    };
  }
}

// Backwards compatibility alias
export const updateCreditsBalance = updateAccountCreditsWithFallback;
