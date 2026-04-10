/**
 * R2 File Deletion Endpoint
 * 
 * POST /api/r2-delete
 * 
 * Two modes:
 *   { keys: string[] }   — Delete specific files by key
 *   { prefix: string }   — List all files under prefix, then delete them all
 * 
 * The prefix mode replaces the supabase.storage.list() + .remove() pattern
 * used when deleting an entire order folder.
 * 
 * Auth: Requires Supabase JWT in Authorization header (Bearer token).
 * The cleanup cron job uses the server-side R2 client directly, not this endpoint.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initSentry, Sentry } from './lib/sentry.js';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { getR2Client, getR2BucketName } from "./lib/r2.js";

// Allowed key/prefix prefixes — prevents arbitrary deletes
const ALLOWED_PREFIXES = ["design-files/", "store-assets/", "printer-assets/"];

// CORS origins
const ALLOWED_ORIGINS = [
  "https://dtflayout.com",
  "https://www.dtflayout.com",
  "http://localhost:5173",
  "http://localhost:5174",
];

function getCorsOrigin(req: VercelRequest): string {
  const origin = req.headers.origin || "";
  if (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".dtflayout.com")
  ) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

/**
 * Verify the Supabase JWT from the Authorization header.
 * Returns the user_id if valid, null otherwise.
 */
async function verifyAuth(req: VercelRequest): Promise<{ userId: string | null; supabase: any }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { userId: null, supabase: null };
  }

  const token = authHeader.replace("Bearer ", "");

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[r2-delete] Missing Supabase credentials for auth verification");
    return { userId: null, supabase: null };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { userId: null, supabase: null };
  }

  return { userId: data.user.id, supabase };
}

/**
 * Verify that the given R2 key belongs to the authenticated user.
 * Checks printer.store_id and quick_store.id ownership.
 */
async function verifyKeyOwnership(supabase: any, userId: string, key: string): Promise<boolean> {
  // Extract the ID portion from the key path
  // design-files/{storeId}/... OR design-files/orders/{storeSlug}/...
  // store-assets/{storeId}/...
  // printer-assets/{anything}/...

  if (key.startsWith("design-files/orders/")) {
    // Quick Store order: design-files/orders/{slug}/{orderCode}/...
    const parts = key.split("/");
    const slug = parts[2];
    if (!slug) return false;
    const { data } = await supabase
      .from("quick_stores").select("id").eq("slug", slug).eq("user_id", userId).single();
    return !!data;
  }

  if (key.startsWith("design-files/")) {
    // WI design: design-files/{store_id}/{designCode}/...
    const parts = key.split("/");
    const storeId = parts[1];
    if (!storeId) return false;
    const { data } = await supabase
      .from("printers").select("id").eq("store_id", storeId).eq("user_id", userId).single();
    return !!data;
  }

  if (key.startsWith("store-assets/")) {
    // QS assets: store-assets/{storeId}/...
    const parts = key.split("/");
    const storeId = parts[1];
    if (!storeId) return false;
    const { data } = await supabase
      .from("quick_stores").select("id").eq("id", storeId).eq("user_id", userId).single();
    return !!data;
  }

  if (key.startsWith("printer-assets/")) {
    // Printer assets — allow for any authenticated user (loose check)
    return true;
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  const corsOrigin = getCorsOrigin(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  res.setHeader("Access-Control-Allow-Origin", corsOrigin);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify authentication
  const { userId, supabase } = await verifyAuth(req);
  if (!userId || !supabase) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { keys, prefix } = req.body;
    const client = getR2Client();
    const bucket = getR2BucketName();

    // Mode 1: Delete specific keys
    if (keys && Array.isArray(keys) && keys.length > 0) {
      // Validate all keys
      for (const key of keys) {
        if (typeof key !== "string") {
          return res.status(400).json({ error: "All keys must be strings" });
        }
        const isAllowed = ALLOWED_PREFIXES.some((p) => key.startsWith(p));
        if (!isAllowed || key.includes("..")) {
          return res.status(400).json({ error: `Invalid key: ${key}` });
        }
        // Verify ownership
        const isOwner = await verifyKeyOwnership(supabase, userId, key);
        if (!isOwner) {
          return res.status(403).json({ error: "You don't have permission to delete this file" });
        }
      }

      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((key: string) => ({ Key: key })),
          Quiet: true,
        },
      });

      await client.send(command);
      return res.status(200).json({ success: true, deleted: keys.length });
    }

    // Mode 2: List by prefix, then delete all
    if (prefix && typeof prefix === "string") {
      const isAllowed = ALLOWED_PREFIXES.some((p) => prefix.startsWith(p));
      if (!isAllowed || prefix.includes("..")) {
        return res.status(400).json({ error: `Invalid prefix: ${prefix}` });
      }

      // Verify ownership of the prefix
      const isOwner = await verifyKeyOwnership(supabase, userId, prefix);
      if (!isOwner) {
        return res.status(403).json({ error: "You don't have permission to delete these files" });
      }

      // List all objects under this prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      });

      const listed = await client.send(listCommand);
      const objects = listed.Contents || [];

      if (objects.length === 0) {
        return res.status(200).json({ success: true, deleted: 0 });
      }

      // Delete them all
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key! })),
          Quiet: true,
        },
      });

      await client.send(deleteCommand);
      return res.status(200).json({ success: true, deleted: objects.length });
    }

    return res.status(400).json({
      error: "Provide either 'keys' (string[]) or 'prefix' (string)",
    });
  } catch (error: any) {
    console.error("[r2-delete] Error:", error);
    Sentry.captureException(error);
    return res.status(500).json({ error: error.message });
  }
}
