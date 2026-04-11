/**
 * Client-side R2 Storage Helper
 * 
 * All file uploads go through presigned URLs:
 *   1. Client calls /api/r2-presign to get a time-limited PUT URL
 *   2. Client uploads directly to R2 using that URL (no Vercel body limit)
 * 
 * File deletions go through /api/r2-delete (requires Supabase auth token).
 * 
 * Public URL construction is a pure string operation — no API call needed.
 * 
 * Bucket prefixes (map to old Supabase bucket names):
 *   "design-files"   → gang sheets, previews (large PNGs, auto-purged)
 *   "store-assets"   → Quick Store logos/banners/favicons/product images
 *   "printer-assets" → Website Integration printer logos
 */

import { supabase } from "@/lib/supabaseClient";

// R2 public URL base — set in .env / Vercel dashboard
const R2_PUBLIC_URL = (
  import.meta.env.VITE_R2_PUBLIC_URL || ""
).replace(/\/$/, "");

// Presign API base — always use main domain for API routes
// Subdomains (thaneprints.dtflayout.com) must call dtflayout.com/api/* directly
const getApiBase = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If on a subdomain (e.g. thaneprints.dtflayout.com), route API calls to main domain
    if (hostname.endsWith('.dtflayout.com') && hostname !== 'dtflayout.com' && hostname !== 'www.dtflayout.com') {
      return 'https://dtflayout.com';
    }
  }
  return '';
};
const API_BASE = getApiBase();

// ═══════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════

/**
 * Upload a file to R2 via presigned URL.
 * 
 * @param bucketPrefix - "design-files" | "store-assets" | "printer-assets"
 * @param path - Object path within the bucket prefix, e.g. "storeId/designCode/sheet_1.png"
 * @param blob - The file data
 * @param contentType - MIME type, e.g. "image/png"
 * @returns { success, publicUrl, key } or { success: false, error }
 */
export async function uploadToR2(
  bucketPrefix: string,
  path: string,
  blob: Blob,
  contentType: string
): Promise<{ success: boolean; publicUrl?: string; key?: string; error?: string }> {
  const key = `${bucketPrefix}/${path}`;
  const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);

  console.log(`[R2] 📤 Uploading ${key} (${fileSizeMB} MB)`);
  const startTime = Date.now();

  try {
    // Step 1: Get presigned URL from our API
    const presignRes = await fetch(`${API_BASE}/api/r2-presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, contentType, contentLength: blob.size }),
    });

    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({ error: "Presign request failed" }));
      console.error("[R2] ❌ Presign error:", err);
      return { success: false, error: err.error || "Failed to get upload URL" };
    }

    const { uploadUrl, publicUrl } = await presignRes.json();

    // Step 2: Upload directly to R2 using presigned URL
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });

    if (!uploadRes.ok) {
      const statusText = uploadRes.statusText || `HTTP ${uploadRes.status}`;
      console.error(`[R2] ❌ Upload failed: ${statusText}`);
      return { success: false, error: `Upload failed: ${statusText}` };
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[R2] ✅ Uploaded ${key} in ${elapsed}s`);

    return { success: true, publicUrl, key };
  } catch (err: any) {
    console.error("[R2] ❌ Exception during upload:", err);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC URL
// ═══════════════════════════════════════════════════════════════════

/**
 * Construct the public URL for an R2 object.
 * Pure string operation — no API call.
 * 
 * @param bucketPrefix - "design-files" | "store-assets" | "printer-assets"
 * @param path - Object path within the bucket prefix
 */
export function getR2PublicUrl(bucketPrefix: string, path: string): string {
  return `${R2_PUBLIC_URL}/${bucketPrefix}/${path}`;
}

// ═══════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the current Supabase auth token for authenticated API calls.
 */
async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * Delete specific files from R2 by their full keys.
 * Requires authentication (logged-in printer user).
 * 
 * @param keys - Array of full R2 keys, e.g. ["design-files/storeId/code/sheet_1.png"]
 */
export async function deleteFromR2(
  keys: string[]
): Promise<{ success: boolean; deleted?: number; error?: string }> {
  if (keys.length === 0) return { success: true, deleted: 0 };

  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const res = await fetch(`${API_BASE}/api/r2-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keys }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Delete request failed" }));
      return { success: false, error: err.error };
    }

    const data = await res.json();
    return { success: true, deleted: data.deleted };
  } catch (err: any) {
    console.error("[R2] Delete error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete all files under a prefix (folder delete).
 * Replaces the supabase.storage.list() + .remove() pattern.
 * Requires authentication.
 * 
 * @param bucketPrefix - "design-files" | "store-assets" | "printer-assets"
 * @param folderPath - Folder path within the prefix, e.g. "storeId/designCode"
 */
export async function deleteR2Folder(
  bucketPrefix: string,
  folderPath: string
): Promise<{ success: boolean; deleted?: number; error?: string }> {
  const prefix = `${bucketPrefix}/${folderPath}`;

  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const res = await fetch(`${API_BASE}/api/r2-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prefix }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Delete request failed" }));
      return { success: false, error: err.error };
    }

    const data = await res.json();
    return { success: true, deleted: data.deleted };
  } catch (err: any) {
    console.error("[R2] Folder delete error:", err);
    return { success: false, error: err.message };
  }
}
