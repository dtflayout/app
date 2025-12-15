import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Outseta Custom Activity API Endpoint
 *
 * Posts custom activities to Outseta to trigger email campaigns.
 * First looks up the person by email, then posts the activity.
 */

type OutsetaActivityType = 'payment_successful' | 'invoice_created' | 'low_credits';

interface OutsetaActivityRequest {
  email: string;
  activityType: OutsetaActivityType;
  metadata?: Record<string, any>;
}

interface OutsetaPerson {
  Uid: string;
  Email: string;
  FullName?: string;
}

// Get Outseta API credentials
const getOutsetaCredentials = () => {
  const apiKey = process.env.OUTSETA_API_KEY;
  const apiSecret = process.env.OUTSETA_API_SECRET;
  const subdomain = process.env.OUTSETA_SUBDOMAIN;

  if (!apiKey || !apiSecret || !subdomain) {
    throw new Error('Missing Outseta environment variables');
  }

  // Outseta uses custom auth format: "Outseta [api-key]:[secret-key]"
  return {
    authHeader: `Outseta ${apiKey}:${apiSecret}`,
    baseUrl: `https://${subdomain}.outseta.com/api/v1`,
  };
};

/**
 * Find a person in Outseta by their email address
 */
async function findPersonByEmail(
  email: string,
  authHeader: string,
  baseUrl: string
): Promise<{ success: boolean; person?: OutsetaPerson; error?: string }> {
  try {
    const url = `${baseUrl}/crm/people?email=${encodeURIComponent(email)}`;

    console.log('[Outseta] ========== PERSON LOOKUP DEBUG ==========');
    console.log('[Outseta] Email being searched:', email);
    console.log('[Outseta] Full URL:', url);
    console.log('[Outseta] Auth header present:', !!authHeader);
    console.log('[Outseta] Auth header prefix:', authHeader?.substring(0, 10) + '...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('[Outseta] Response status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('[Outseta] Raw response body:', responseText);

    if (!response.ok) {
      console.error('[Outseta] Failed to find person - Status:', response.status);
      return {
        success: false,
        error: `Failed to find person: ${response.status} ${responseText}`,
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[Outseta] Failed to parse JSON response:', parseErr);
      return {
        success: false,
        error: 'Failed to parse API response',
      };
    }

    console.log('[Outseta] Parsed response keys:', Object.keys(data));
    console.log('[Outseta] Full parsed response:', JSON.stringify(data, null, 2));

    // Try multiple possible response structures
    const items = data.items || data.Items || data.results || data.Results || [];
    console.log('[Outseta] Items array length:', items.length);

    if (items.length === 0) {
      console.log('[Outseta] No person found for email:', email);
      return {
        success: false,
        error: `No person found with email: ${email}`,
      };
    }

    // Find the person with matching email (case-insensitive)
    console.log('[Outseta] Searching for exact email match:', email);
    const matchingPerson = items.find(
      (person: any) => person.Email?.toLowerCase() === email.toLowerCase()
    );

    if (!matchingPerson) {
      console.log('[Outseta] No exact email match found. Available emails:',
        items.map((p: any) => p.Email).join(', ')
      );
      return {
        success: false,
        error: `No person found with exact email: ${email}`,
      };
    }

    console.log('[Outseta] Found matching person:', JSON.stringify(matchingPerson, null, 2));
    console.log('[Outseta] Matched person UID:', matchingPerson.Uid, 'Email:', matchingPerson.Email);

    return {
      success: true,
      person: {
        Uid: matchingPerson.Uid,
        Email: matchingPerson.Email,
        FullName: matchingPerson.FullName,
      },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Outseta] Exception finding person:', errorMessage);
    return {
      success: false,
      error: `Network error: ${errorMessage}`,
    };
  }
}

/**
 * Post a custom activity to Outseta
 */
async function postCustomActivity(
  personUid: string,
  activityType: OutsetaActivityType,
  metadata: Record<string, any>,
  authHeader: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Try the /activities endpoint (not /activities/customactivity)
    const url = `${baseUrl}/activities`;

    console.log('[Outseta] ========== POST ACTIVITY DEBUG ==========');
    console.log('[Outseta] Person UID:', personUid);
    console.log('[Outseta] Activity Type:', activityType);
    console.log('[Outseta] Full URL being called:', url);
    console.log('[Outseta] HTTP Method: POST');

    // Build activity description from metadata
    let description = `Activity: ${activityType}`;
    if (Object.keys(metadata).length > 0) {
      description += ` | ${JSON.stringify(metadata)}`;
    }

    const requestBody = {
      EntityUid: personUid,
      EntityType: 2, // 1 = Account, 2 = Person (needed for drip campaigns)
      Title: activityType,
      Description: description,
      ActivityData: JSON.stringify(metadata),
    };

    console.log('[Outseta] Request payload:', JSON.stringify(requestBody, null, 2));
    console.log('[Outseta] Auth header prefix:', authHeader?.substring(0, 15) + '...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Outseta] Response status:', response.status, response.statusText);
    console.log('[Outseta] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    // Always read the response body for logging
    const responseText = await response.text();
    console.log('[Outseta] Raw response body:', responseText);

    if (!response.ok) {
      console.error('[Outseta] ❌ Failed to post activity');
      console.error('[Outseta] Status:', response.status);
      console.error('[Outseta] Response:', responseText);
      return {
        success: false,
        error: `Failed to post activity: ${response.status} ${responseText}`,
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawResponse: responseText };
    }

    console.log('[Outseta] ✅ Activity posted successfully!');
    console.log('[Outseta] Response data:', JSON.stringify(data, null, 2));

    return {
      success: true,
      data,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Outseta] ❌ Exception posting activity:', errorMessage);
    console.error('[Outseta] Full error:', err);
    return {
      success: false,
      error: `Network error: ${errorMessage}`,
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, activityType, metadata = {} } = req.body as OutsetaActivityRequest;

    console.log('[Outseta Activity] Request received:', {
      email,
      activityType,
      hasMetadata: Object.keys(metadata).length > 0,
    });

    // Validate required fields
    if (!email || !activityType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email and activityType',
      });
    }

    // Validate activity type
    const validActivityTypes: OutsetaActivityType[] = [
      'payment_successful',
      'invoice_created',
      'low_credits',
    ];
    if (!validActivityTypes.includes(activityType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid activity type. Must be one of: ${validActivityTypes.join(', ')}`,
      });
    }

    // Get Outseta credentials
    let credentials;
    try {
      credentials = getOutsetaCredentials();
    } catch (e) {
      console.error('[Outseta Activity] Credentials not configured');
      return res.status(500).json({
        success: false,
        error: 'Outseta not configured',
      });
    }

    // Step 1: Find the person by email
    const personResult = await findPersonByEmail(
      email,
      credentials.authHeader,
      credentials.baseUrl
    );

    if (!personResult.success || !personResult.person) {
      // If person not found, log but don't fail the request
      // The activity might still be relevant for analytics
      console.warn('[Outseta Activity] Person not found, skipping activity post');
      return res.status(200).json({
        success: true,
        message: 'Person not found in Outseta, activity skipped',
        personNotFound: true,
      });
    }

    // Step 2: Post the custom activity
    const activityResult = await postCustomActivity(
      personResult.person.Uid,
      activityType,
      metadata,
      credentials.authHeader,
      credentials.baseUrl
    );

    if (!activityResult.success) {
      console.error('[Outseta Activity] Failed to post activity:', activityResult.error);
      return res.status(500).json({
        success: false,
        error: activityResult.error,
      });
    }

    console.log('[Outseta Activity] Activity posted successfully');
    return res.status(200).json({
      success: true,
      message: 'Activity posted successfully',
      activityType,
      personUid: personResult.person.Uid,
    });
  } catch (error: any) {
    console.error('[Outseta Activity] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
