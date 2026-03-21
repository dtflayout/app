/**
 * Session Storage using IndexedDB
 * 
 * This module provides auto-recovery functionality by storing the user's
 * work-in-progress to IndexedDB. Unlike localStorage, IndexedDB can store
 * binary data (File/Blob objects) which is essential for preserving uploaded images.
 * 
 * Storage limits: ~50MB minimum guaranteed, often 500MB+ depending on browser/device
 * 
 * Schema:
 * - Database: dtf-layout-sessions
 * - Object Store: sessions
 *   - key: 'current' (single active session)
 *   - value: SessionData object
 */

import { ImageDimension } from '@/utils/layoutAlgorithm';

// ============================================================================
// Types
// ============================================================================

/**
 * ImageObject type - defined here to avoid circular import with CollageCreator.
 * This matches the ImageObject interface in CollageCreator.tsx
 */
export interface ImageObjectForStorage {
  id: string;
  file: File;
  url: string;
  thumbnailUrl: string;
  previewUrl?: string;
  originalWidth?: number;
  originalHeight?: number;
}

export interface StoredImage {
  id: string;
  file: File;  // IndexedDB can store File objects directly
  fileName: string;
  fileType: string;
  fileSize: number;
  // We don't store blob URLs - they're regenerated on restore
  originalWidth?: number;
  originalHeight?: number;
}

export interface SessionData {
  id: string;
  version: number;  // For future schema migrations
  timestamp: number;
  canvasWidthInches: number;
  spacingInches: number;
  images: StoredImage[];
  imageDimensions: ImageDimension[];
}

export interface SessionMetadata {
  id: string;
  timestamp: number;
  imageCount: number;
  canvasWidthInches: number;
}

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'dtf-layout-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const SESSION_SCHEMA_VERSION = 1;

// Auto-save debounce delay (ms)
export const AUTO_SAVE_DELAY = 2000;

// Session expiry (24 hours) - sessions older than this will be auto-cleared
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Session Key Generation (Route-Scoped)
// ============================================================================

export interface SessionScope {
  mode: 'standalone' | 'public';
  printerSlug?: string;
  productSlug?: string;
}

/**
 * Generate a unique session key based on the current context.
 * - Standalone mode: 'session-standalone'
 * - Public builder: 'session-public-{printerSlug}-{productSlug}'
 */
export const getSessionKey = (scope: SessionScope): string => {
  if (scope.mode === 'public' && scope.printerSlug && scope.productSlug) {
    return `session-public-${scope.printerSlug}-${scope.productSlug}`;
  }
  return 'session-standalone';
};

// ============================================================================
// IndexedDB Setup
// ============================================================================

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize and return the IndexedDB database instance.
 * Uses singleton pattern to avoid multiple connections.
 */
const getDB = (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[SessionStorage] Failed to open database:', request.error);
      dbInitPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[SessionStorage] Database opened successfully');

      // Handle database close (e.g., when browser clears data)
      dbInstance.onclose = () => {
        console.log('[SessionStorage] Database connection closed');
        dbInstance = null;
        dbInitPromise = null;
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      console.log('[SessionStorage] Upgrading database schema...');
      const db = (event.target as IDBOpenDBRequest).result;

      // Create sessions object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log('[SessionStorage] Created sessions object store');
      }
    };
  });

  return dbInitPromise;
};

// ============================================================================
// Session Operations
// ============================================================================

/**
 * Save the current session to IndexedDB.
 * This stores all images (as File objects) and their dimensions.
 * 
 * @param sessionKey - Unique key for this session (from getSessionKey)
 */
export const saveSession = async (
  sessionKey: string,
  images: ImageObjectForStorage[],
  imageDimensions: ImageDimension[],
  canvasWidthInches: number,
  spacingInches: number
): Promise<void> => {
  try {
    console.log(`[SessionStorage] Saving session (${sessionKey}): ${images.length} images`);
    const db = await getDB();

    // Convert ImageObjects to StoredImages (strip blob URLs, keep File objects)
    const storedImages: StoredImage[] = images.map(img => ({
      id: img.id,
      file: img.file,
      fileName: img.file.name,
      fileType: img.file.type,
      fileSize: img.file.size,
      originalWidth: img.originalWidth,
      originalHeight: img.originalHeight,
    }));

    const sessionData: SessionData = {
      id: `session-${Date.now()}`,
      version: SESSION_SCHEMA_VERSION,
      timestamp: Date.now(),
      canvasWidthInches,
      spacingInches,
      images: storedImages,
      imageDimensions,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put(sessionData, sessionKey);

      request.onsuccess = () => {
        console.log(`[SessionStorage] Session saved (${sessionKey}): ${storedImages.length} images, ${imageDimensions.length} dimensions`);
        resolve();
      };

      request.onerror = () => {
        console.error('[SessionStorage] Failed to save session:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[SessionStorage] Error saving session:', error);
    throw error;
  }
};

/**
 * Load the current session from IndexedDB.
 * Returns null if no session exists or if session is expired.
 * 
 * @param sessionKey - Unique key for this session (from getSessionKey)
 */
export const loadSession = async (sessionKey: string): Promise<SessionData | null> => {
  console.log(`[SessionStorage] loadSession called with key: ${sessionKey}`);
  
  try {
    const db = await getDB();
    console.log('[SessionStorage] Got database connection');

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      console.log(`[SessionStorage] Requesting session data for key: ${sessionKey}`);
      const request = store.get(sessionKey);

      request.onsuccess = () => {
        const session = request.result as SessionData | undefined;
        console.log('[SessionStorage] Request result:', session ? `Found session with ${session.images?.length} images` : 'No session found');

        if (!session) {
          console.log(`[SessionStorage] No session found for key: ${sessionKey}`);
          resolve(null);
          return;
        }

        // Check if session is expired
        const age = Date.now() - session.timestamp;
        if (age > SESSION_EXPIRY_MS) {
          console.log('[SessionStorage] Session expired, clearing...');
          clearSession(sessionKey).catch(console.error);
          resolve(null);
          return;
        }

        console.log(`[SessionStorage] Session loaded (${sessionKey}): ${session.images.length} images`);
        resolve(session);
      };

      request.onerror = () => {
        console.error('[SessionStorage] Failed to load session:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[SessionStorage] Error loading session:', error);
    return null;
  }
};

/**
 * Get session metadata without loading full image data.
 * Useful for showing "Resume session?" prompt.
 * 
 * @param sessionKey - Unique key for this session (from getSessionKey)
 */
export const getSessionMetadata = async (sessionKey: string): Promise<SessionMetadata | null> => {
  try {
    const session = await loadSession(sessionKey);
    if (!session) return null;

    return {
      id: session.id,
      timestamp: session.timestamp,
      imageCount: session.images.length,
      canvasWidthInches: session.canvasWidthInches,
    };
  } catch (error) {
    console.error('[SessionStorage] Error getting session metadata:', error);
    return null;
  }
};

/**
 * Clear the current session from IndexedDB.
 * 
 * @param sessionKey - Unique key for this session (from getSessionKey)
 */
export const clearSession = async (sessionKey: string): Promise<void> => {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.delete(sessionKey);

      request.onsuccess = () => {
        console.log(`[SessionStorage] Session cleared: ${sessionKey}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[SessionStorage] Failed to clear session:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[SessionStorage] Error clearing session:', error);
    throw error;
  }
};

/**
 * Check if a session exists (without loading full data).
 * 
 * @param sessionKey - Unique key for this session (from getSessionKey)
 */
export const hasSession = async (sessionKey: string): Promise<boolean> => {
  const metadata = await getSessionMetadata(sessionKey);
  return metadata !== null && metadata.imageCount > 0;
};

// ============================================================================
// Restore Helpers
// ============================================================================

/**
 * Convert StoredImages back to ImageObjects.
 * Regenerates blob URLs from File objects.
 */
export const restoreImageObjects = async (
  storedImages: StoredImage[]
): Promise<ImageObjectForStorage[]> => {
  const { generateThumbnail } = await import('@/utils/thumbnailUtils');

  const imageObjects: ImageObjectForStorage[] = await Promise.all(
    storedImages.map(async (stored) => {
      // Generate fresh blob URL from File object
      const url = URL.createObjectURL(stored.file);

      // Generate thumbnail for gallery display
      let thumbnailUrl: string;
      try {
        thumbnailUrl = await generateThumbnail(stored.file, 300);
      } catch (error) {
        console.error(`Failed to generate thumbnail for ${stored.fileName}:`, error);
        thumbnailUrl = url; // Fallback to full URL
      }

      return {
        id: stored.id,
        file: stored.file,
        url,
        thumbnailUrl,
        originalWidth: stored.originalWidth,
        originalHeight: stored.originalHeight,
      };
    })
  );

  return imageObjects;
};

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Get storage usage estimate (if available).
 */
export const getStorageEstimate = async (): Promise<{
  usage: number;
  quota: number;
} | null> => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
};

/**
 * Format bytes to human-readable string.
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format timestamp to relative time string.
 */
export const formatRelativeTime = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};
