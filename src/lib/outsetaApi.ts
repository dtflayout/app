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

// Backwards compatibility alias
export const updateCreditsBalance = updateAccountCreditsWithFallback;
