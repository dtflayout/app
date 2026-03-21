import { useMemo } from 'react';

interface SubdomainInfo {
  isStorefront: boolean;
  storeSlug: string | null;
  isMainSite: boolean;
}

const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'admin', 'blog', 'help', 
  'support', 'status', 'mail', 'billing', 'dashboard',
  'login', 'signup', 'auth', 'oauth', 'pricing',
  'about', 'contact', 'terms', 'privacy', 'faq',
  'docs', 'developer', 'developers', 'store', 'stores',
  'quick-store', 'quickstore', 'test', 'demo'
];

/**
 * Hook to detect if current URL is a Quick Store subdomain
 * 
 * Examples:
 * - mumbai-prints.dtflayout.com -> { isStorefront: true, storeSlug: 'mumbai-prints' }
 * - dtflayout.com -> { isStorefront: false, storeSlug: null }
 * - www.dtflayout.com -> { isStorefront: false, storeSlug: null }
 * - app.dtflayout.com -> { isStorefront: false, storeSlug: null }
 */
export function useSubdomain(): SubdomainInfo {
  return useMemo(() => {
    const hostname = window.location.hostname;
    
    let subdomain: string | null = null;
    
    // Production: store-slug.dtflayout.com
    if (hostname.endsWith('.dtflayout.com')) {
      const parts = hostname.split('.');
      if (parts.length === 3) {
        subdomain = parts[0].toLowerCase();
      }
    }
    // Dev: store-slug.localhost or store-slug.localhost:port
    else if (hostname.includes('.localhost')) {
      const hostWithoutPort = hostname.split(':')[0];
      const parts = hostWithoutPort.split('.');
      if (parts.length === 2 && parts[1] === 'localhost') {
        subdomain = parts[0].toLowerCase();
      }
    }
    // Also support: store-slug.local.dtflayout.com for staging
    else if (hostname.endsWith('.local.dtflayout.com')) {
      const parts = hostname.split('.');
      if (parts.length === 4) {
        subdomain = parts[0].toLowerCase();
      }
    }
    
    // Check if it's a valid store subdomain (not reserved)
    const isStorefront = subdomain !== null && !RESERVED_SUBDOMAINS.includes(subdomain);
    
    return {
      isStorefront,
      storeSlug: isStorefront ? subdomain : null,
      isMainSite: !isStorefront,
    };
  }, []);
}

/**
 * Get store slug from URL path (fallback for path-based routing)
 * Used when subdomain isn't available
 * 
 * Examples:
 * - /s/mumbai-prints -> 'mumbai-prints'
 * - /s/mumbai-prints/products -> 'mumbai-prints'
 * - /app/dashboard -> null
 */
export function getStoreSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/s\/([a-z0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * Build store URL from slug
 */
export function buildStoreUrl(slug: string): string {
  // In production, use subdomain
  if (window.location.hostname === 'dtflayout.com' || 
      window.location.hostname.endsWith('.dtflayout.com')) {
    return `https://${slug}.dtflayout.com`;
  }
  
  // In development, use path-based fallback
  return `${window.location.origin}/s/${slug}`;
}

/**
 * Check if a slug is reserved
 */
export function isSlugReserved(slug: string): boolean {
  return RESERVED_SUBDOMAINS.includes(slug.toLowerCase());
}

export default useSubdomain;
