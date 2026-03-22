import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName } from './lib/r2';

/**
 * Cron job: Clean up expired orders (both Website Integration and Quick Store)
 * 
 * Website Integration (designs table):
 * - Marks pending orders past their expires_at as "expired"
 * - Deletes R2 files and DB records for orders expired > 30 days ago
 * 
 * Quick Store (quick_store_orders table):
 * - Deletes R2 files and DB records for orders past their expires_at by > 30 days
 * 
 * Schedule: Runs daily via Vercel Cron
 * Endpoint: GET /api/cleanup-expired
 * Auth: CRON_SECRET header check
 */

/**
 * Delete all R2 objects under a given prefix (folder).
 */
async function deleteR2Folder(prefix: string): Promise<number> {
  const r2 = getR2Client();
  const bucket = getR2BucketName();

  const listCmd = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });

  const listed = await r2.send(listCmd);
  const objects = listed.Contents || [];

  if (objects.length === 0) return 0;

  const deleteCmd = new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: {
      Objects: objects.map((obj) => ({ Key: obj.Key! })),
      Quiet: true,
    },
  });

  await r2.send(deleteCmd);
  return objects.length;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cleanup] CRON_SECRET env var is not set — refusing to run');
    return res.status(500).json({ error: 'Cron authentication not configured' });
  }
  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
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

      // R2 key prefix: design-files/{storeId}/{designCode}/
      const r2Prefix = `design-files/${storeId}/${order.design_code}/`;
      try {
        await deleteR2Folder(r2Prefix);
      } catch (err) {
        console.error(`[Cleanup] Error deleting R2 files for WI order ${order.id}:`, err);
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

      // R2 key prefix: design-files/orders/{storeSlug}/{orderCode}/
      const r2Prefix = `design-files/orders/${storeSlug}/${order.order_code}/`;
      try {
        await deleteR2Folder(r2Prefix);
      } catch (err) {
        console.error(`[Cleanup] Error deleting R2 files for QS order ${order.id}:`, err);
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
