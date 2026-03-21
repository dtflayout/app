import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron job: Clean up expired orders (both Website Integration and Quick Store)
 * 
 * Website Integration (designs table):
 * - Marks pending orders past their expires_at as "expired"
 * - Deletes storage files and DB records for orders expired > 30 days ago
 * 
 * Quick Store (quick_store_orders table):
 * - Deletes storage files and DB records for orders past their expires_at by > 30 days
 * 
 * Schedule: Runs daily via Vercel Cron
 * Endpoint: GET /api/cleanup-expired
 * Auth: CRON_SECRET header check
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Cleanup] Missing Supabase credentials');
    return res.status(500).json({ error: 'Not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ═══════════════════════════════════════════════════════════════════════
    // WEBSITE INTEGRATION (designs table)
    // ═══════════════════════════════════════════════════════════════════════

    // Step 1: Mark pending WI orders past their expires_at as "expired"
    const { data: newlyExpired, error: markError } = await supabase
      .from('designs')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', now)
      .select('id');

    if (markError) {
      console.error('[Cleanup] Error marking WI expired:', markError);
    }

    const wiMarkedCount = newlyExpired?.length || 0;
    console.log(`[Cleanup] WI: Marked ${wiMarkedCount} orders as expired`);

    // Step 2: Find WI orders expired > 30 days ago for permanent deletion
    const { data: oldExpired, error: fetchError } = await supabase
      .from('designs')
      .select('id, design_code, printer_id, printers!inner(store_id)')
      .eq('status', 'expired')
      .lt('expires_at', thirtyDaysAgo)
      .limit(100);

    if (fetchError) {
      console.error('[Cleanup] Error fetching old WI expired:', fetchError);
    }

    let wiDeletedCount = 0;

    for (const order of (oldExpired || [])) {
      const storeId = (order as any).printers?.store_id;
      if (!storeId) continue;

      const folderPath = `${storeId}/${order.design_code}`;
      const { data: files } = await supabase.storage
        .from('design-files')
        .list(folderPath);

      if (files && files.length > 0) {
        const filePaths = files.map((f: any) => `${folderPath}/${f.name}`);
        await supabase.storage.from('design-files').remove(filePaths);
      }

      const { error: delError } = await supabase
        .from('designs')
        .delete()
        .eq('id', order.id);

      if (!delError) wiDeletedCount++;
    }

    console.log(`[Cleanup] WI: Permanently deleted ${wiDeletedCount} old expired orders`);

    // ═══════════════════════════════════════════════════════════════════════
    // QUICK STORE (quick_store_orders table)
    // ═══════════════════════════════════════════════════════════════════════

    // Find QS orders expired > 30 days ago for permanent deletion
    // Join with quick_stores to get the store slug for file paths
    const { data: oldQSExpired, error: qsFetchError } = await supabase
      .from('quick_store_orders')
      .select('id, order_code, quick_store_id, quick_stores!inner(slug)')
      .lt('expires_at', thirtyDaysAgo)
      .limit(100);

    if (qsFetchError) {
      console.error('[Cleanup] Error fetching old QS expired:', qsFetchError);
    }

    let qsDeletedCount = 0;

    for (const order of (oldQSExpired || [])) {
      const storeSlug = (order as any).quick_stores?.slug;
      if (!storeSlug) continue;

      // QS files are stored at: orders/{storeSlug}/{orderCode}/
      const folderPath = `orders/${storeSlug}/${order.order_code}`;
      const { data: files } = await supabase.storage
        .from('design-files')
        .list(folderPath);

      if (files && files.length > 0) {
        const filePaths = files.map((f: any) => `${folderPath}/${f.name}`);
        await supabase.storage.from('design-files').remove(filePaths);
      }

      const { error: delError } = await supabase
        .from('quick_store_orders')
        .delete()
        .eq('id', order.id);

      if (!delError) qsDeletedCount++;
    }

    console.log(`[Cleanup] QS: Permanently deleted ${qsDeletedCount} old expired orders`);

    return res.status(200).json({
      success: true,
      website_integration: {
        marked: wiMarkedCount,
        deleted: wiDeletedCount,
      },
      quick_store: {
        deleted: qsDeletedCount,
      },
      timestamp: now,
    });
  } catch (error: any) {
    console.error('[Cleanup] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
