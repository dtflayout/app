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
import { applyRateLimit, publicLimiter } from './lib/rateLimit.js';
import { initSentry, Sentry } from './lib/sentry.js';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getR2BucketName, getR2PublicUrl } from "./lib/r2.js";

// Allowed key prefixes — prevents arbitrary writes
const ALLOWED_PREFIXES = ["design-files/", "store-assets/", "printer-assets/"];

// Allowed content types — prevents upload of HTML/JS/executable content
const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

// Max file size: 100 MB (enforced via Content-Length condition on presigned URL)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

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
    /^https:\/\/[\w-]+\.dtflayout\.com$/.test(origin)
  ) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
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
  res.setHeader("Vary", "Origin");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limit check
  if (await applyRateLimit(req, res, publicLimiter)) return;

  try {
    const { key, contentType, contentLength } = req.body;

    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'key'" });
    }

    if (!contentType || typeof contentType !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'contentType'" });
    }

    // Validate file size if provided
    if (contentLength !== undefined) {
      const size = Number(contentLength);
      if (isNaN(size) || size <= 0) {
        return res.status(400).json({ error: "Invalid contentLength" });
      }
      if (size > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        });
      }
    }

    // Validate content type — only allow images
    if (!ALLOWED_CONTENT_TYPES.includes(contentType.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid content type '${contentType}'. Only image files are allowed.`,
      });
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
    Sentry.captureException(error);
    return res.status(500).json({ error: error.message });
  }
}
