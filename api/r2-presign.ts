/**
 * R2 Presigned URL Generator
 * 
 * POST /api/r2-presign
 * Body: { key: string, contentType: string }
 * 
 * Returns a presigned PUT URL valid for 1 hour.
 * The client uploads directly to R2 using this URL — no file data
 * passes through Vercel, so there's no body size limit.
 * 
 * Security notes:
 * - This endpoint is intentionally unauthenticated because the public builder
 *   is used by end customers without accounts.
 * - The key prefix is validated to only allow known bucket paths.
 * - Presigned URLs are single-use (PUT only) and expire in 1 hour.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getR2BucketName, getR2PublicUrl } from "./lib/r2.js";

// Allowed key prefixes — prevents arbitrary writes
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
  // Also allow *.dtflayout.com subdomains (for Quick Store storefronts)
  if (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".dtflayout.com")
  ) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOrigin = getCorsOrigin(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { key, contentType } = req.body;

    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'key'" });
    }

    if (!contentType || typeof contentType !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'contentType'" });
    }

    // Validate key prefix
    const isAllowed = ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (!isAllowed) {
      return res.status(400).json({
        error: `Invalid key prefix. Must start with one of: ${ALLOWED_PREFIXES.join(", ")}`,
      });
    }

    // Prevent path traversal
    if (key.includes("..") || key.includes("//")) {
      return res.status(400).json({ error: "Invalid key path" });
    }

    const client = getR2Client();
    const bucket = getR2BucketName();
    const publicUrl = getR2PublicUrl();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    // Generate presigned URL valid for 1 hour
    const presignedUrl = await getSignedUrl(client, command, {
      expiresIn: 3600,
    });

    // Construct the public URL for this object
    const objectPublicUrl = `${publicUrl}/${key}`;

    return res.status(200).json({
      uploadUrl: presignedUrl,
      publicUrl: objectPublicUrl,
      key,
    });
  } catch (error: any) {
    console.error("[r2-presign] Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
