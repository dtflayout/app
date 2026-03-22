/**
 * Shared R2 S3 Client for Vercel serverless functions
 * 
 * Uses @aws-sdk/client-s3 since Cloudflare R2 is S3-compatible.
 * This module is server-side only — never imported from client code.
 * 
 * Required env vars (set in Vercel dashboard):
 *   R2_ACCOUNT_ID        — Cloudflare account ID
 *   R2_ACCESS_KEY_ID     — R2 API token access key
 *   R2_SECRET_ACCESS_KEY — R2 API token secret key
 *   R2_BUCKET_NAME       — R2 bucket name (e.g. "dtf-storage")
 *   R2_PUBLIC_URL        — Public access URL (e.g. "https://pub-xxx.r2.dev" or custom domain)
 */

import { S3Client } from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("[R2] Missing R2 credentials in environment variables");
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return _client;
}

export function getR2BucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("[R2] Missing R2_BUCKET_NAME env var");
  return bucket;
}

export function getR2PublicUrl(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error("[R2] Missing R2_PUBLIC_URL env var");
  // Remove trailing slash if present
  return url.replace(/\/$/, "");
}
