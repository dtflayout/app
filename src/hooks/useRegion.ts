import { useState, useEffect } from 'react';

/**
 * useRegion — Shared hook for IP-based region detection.
 * 
 * - Calls /api/geo on first load (reads Vercel's x-vercel-ip-country header)
 * - Caches result in localStorage for 7 days
 * - Module-level cache so multiple components don't re-fetch
 * - Default/fallback: 'global' (USD pricing)
 * 
 * Usage:
 *   const { region, isLoading } = useRegion();
 *   // region is 'india' | 'global'
 */

type Region = 'india' | 'global';

const CACHE_KEY = 'dtf_region';
const CACHE_TS_KEY = 'dtf_region_ts';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Module-level state so all hook instances share one fetch
let cachedRegion: Region | null = null;
let fetchPromise: Promise<Region> | null = null;

function getFromLocalStorage(): Region | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (cached && ts && Date.now() - Number(ts) < CACHE_TTL) {
      return cached as Region;
    }
  } catch {
    // localStorage unavailable (SSR, incognito overflow, etc.)
  }
  return null;
}

function saveToLocalStorage(region: Region) {
  try {
    localStorage.setItem(CACHE_KEY, region);
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {
    // Ignore write failures
  }
}

async function detectRegion(): Promise<Region> {
  // Check localStorage first
  const stored = getFromLocalStorage();
  if (stored) return stored;

  try {
    const res = await fetch('/api/geo');
    if (!res.ok) return 'global';
    const data = await res.json();
    const region: Region = data.region === 'india' ? 'india' : 'global';
    saveToLocalStorage(region);
    return region;
  } catch {
    return 'global';
  }
}

export function useRegion(): { region: Region; isLoading: boolean } {
  // Initialize from cache synchronously to avoid flash
  const [region, setRegion] = useState<Region>(() => {
    if (cachedRegion) return cachedRegion;
    const stored = getFromLocalStorage();
    if (stored) {
      cachedRegion = stored;
      return stored;
    }
    return 'global'; // Default fallback
  });
  const [isLoading, setIsLoading] = useState(!cachedRegion);

  useEffect(() => {
    if (cachedRegion) {
      setRegion(cachedRegion);
      setIsLoading(false);
      return;
    }

    // Single shared fetch across all hook instances
    if (!fetchPromise) {
      fetchPromise = detectRegion();
    }

    fetchPromise.then((detected) => {
      cachedRegion = detected;
      setRegion(detected);
      setIsLoading(false);
    });
  }, []);

  return { region, isLoading };
}
