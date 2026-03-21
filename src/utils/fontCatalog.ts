// ============ FONT CATALOG ============
// ~100 curated Google Fonts organized by category with on-demand loading

export type FontCategory = "display" | "sans" | "serif" | "script" | "mono" | "decorative";

export interface FontEntry {
  family: string;
  category: FontCategory;
  weights: number[]; // Available weights (400=regular, 700=bold, etc.)
  italic: boolean;   // Whether italic is available
}

export const FONT_CATEGORIES: { id: FontCategory; label: string; count?: number }[] = [
  { id: "display", label: "Display" },
  { id: "sans", label: "Sans Serif" },
  { id: "serif", label: "Serif" },
  { id: "script", label: "Script" },
  { id: "decorative", label: "Decorative" },
  { id: "mono", label: "Monospace" },
];

export const FONT_CATALOG: FontEntry[] = [
  // ============ DISPLAY (~25) ============
  { family: "Impact", category: "display", weights: [400], italic: false },
  { family: "Bebas Neue", category: "display", weights: [400], italic: false },
  { family: "Anton", category: "display", weights: [400], italic: false },
  { family: "Righteous", category: "display", weights: [400], italic: false },
  { family: "Bungee", category: "display", weights: [400], italic: false },
  { family: "Bungee Shade", category: "display", weights: [400], italic: false },
  { family: "Black Ops One", category: "display", weights: [400], italic: false },
  { family: "Russo One", category: "display", weights: [400], italic: false },
  { family: "Teko", category: "display", weights: [300, 400, 500, 600, 700], italic: false },
  { family: "Oswald", category: "display", weights: [200, 300, 400, 500, 600, 700], italic: false },
  { family: "Staatliches", category: "display", weights: [400], italic: false },
  { family: "Alfa Slab One", category: "display", weights: [400], italic: false },
  { family: "Passion One", category: "display", weights: [400, 700, 900], italic: false },
  { family: "Bowlby One SC", category: "display", weights: [400], italic: false },
  { family: "Bungee Inline", category: "display", weights: [400], italic: false },
  { family: "Fugaz One", category: "display", weights: [400], italic: false },
  { family: "Kanit", category: "display", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Saira Stencil One", category: "display", weights: [400], italic: false },
  { family: "Rubik Mono One", category: "display", weights: [400], italic: false },
  { family: "Chango", category: "display", weights: [400], italic: false },
  { family: "Monoton", category: "display", weights: [400], italic: false },
  { family: "Archivo Black", category: "display", weights: [400], italic: false },
  { family: "Racing Sans One", category: "display", weights: [400], italic: false },
  { family: "Lilita One", category: "display", weights: [400], italic: false },
  { family: "Secular One", category: "display", weights: [400], italic: false },

  // ============ SANS SERIF (~25) ============
  { family: "Roboto", category: "sans", weights: [100, 300, 400, 500, 700, 900], italic: true },
  { family: "Open Sans", category: "sans", weights: [300, 400, 500, 600, 700, 800], italic: true },
  { family: "Montserrat", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Poppins", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Lato", category: "sans", weights: [100, 300, 400, 700, 900], italic: true },
  { family: "Nunito", category: "sans", weights: [200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Raleway", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Ubuntu", category: "sans", weights: [300, 400, 500, 700], italic: true },
  { family: "Quicksand", category: "sans", weights: [300, 400, 500, 600, 700], italic: false },
  { family: "Comfortaa", category: "sans", weights: [300, 400, 500, 600, 700], italic: false },
  { family: "Barlow", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Barlow Condensed", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Josefin Sans", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700], italic: true },
  { family: "Work Sans", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Rubik", category: "sans", weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Mukta", category: "sans", weights: [200, 300, 400, 500, 600, 700, 800], italic: false },
  { family: "Cabin", category: "sans", weights: [400, 500, 600, 700], italic: true },
  { family: "DM Sans", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Exo 2", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Archivo", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Outfit", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: "Lexend", category: "sans", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: false },
  { family: "Figtree", category: "sans", weights: [300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Manrope", category: "sans", weights: [200, 300, 400, 500, 600, 700, 800], italic: false },
  { family: "Space Grotesk", category: "sans", weights: [300, 400, 500, 600, 700], italic: false },

  // ============ SERIF (~15) ============
  { family: "Playfair Display", category: "serif", weights: [400, 500, 600, 700, 800, 900], italic: true },
  { family: "Merriweather", category: "serif", weights: [300, 400, 700, 900], italic: true },
  { family: "Lora", category: "serif", weights: [400, 500, 600, 700], italic: true },
  { family: "Crimson Text", category: "serif", weights: [400, 600, 700], italic: true },
  { family: "EB Garamond", category: "serif", weights: [400, 500, 600, 700, 800], italic: true },
  { family: "Cormorant Garamond", category: "serif", weights: [300, 400, 500, 600, 700], italic: true },
  { family: "Libre Baskerville", category: "serif", weights: [400, 700], italic: true },
  { family: "Bitter", category: "serif", weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "Spectral", category: "serif", weights: [200, 300, 400, 500, 600, 700, 800], italic: true },
  { family: "Cardo", category: "serif", weights: [400, 700], italic: true },
  { family: "Cinzel", category: "serif", weights: [400, 500, 600, 700, 800, 900], italic: false },
  { family: "Cinzel Decorative", category: "serif", weights: [400, 700, 900], italic: false },
  { family: "Vollkorn", category: "serif", weights: [400, 500, 600, 700, 800, 900], italic: true },
  { family: "DM Serif Display", category: "serif", weights: [400], italic: true },
  { family: "Bodoni Moda", category: "serif", weights: [400, 500, 600, 700, 800, 900], italic: true },

  // ============ SCRIPT / HANDWRITING (~20) ============
  { family: "Pacifico", category: "script", weights: [400], italic: false },
  { family: "Dancing Script", category: "script", weights: [400, 500, 600, 700], italic: false },
  { family: "Great Vibes", category: "script", weights: [400], italic: false },
  { family: "Satisfy", category: "script", weights: [400], italic: false },
  { family: "Sacramento", category: "script", weights: [400], italic: false },
  { family: "Allura", category: "script", weights: [400], italic: false },
  { family: "Alex Brush", category: "script", weights: [400], italic: false },
  { family: "Kaushan Script", category: "script", weights: [400], italic: false },
  { family: "Caveat", category: "script", weights: [400, 500, 600, 700], italic: false },
  { family: "Indie Flower", category: "script", weights: [400], italic: false },
  { family: "Shadows Into Light", category: "script", weights: [400], italic: false },
  { family: "Patrick Hand", category: "script", weights: [400], italic: false },
  { family: "Amatic SC", category: "script", weights: [400, 700], italic: false },
  { family: "Courgette", category: "script", weights: [400], italic: false },
  { family: "Cookie", category: "script", weights: [400], italic: false },
  { family: "Yellowtail", category: "script", weights: [400], italic: false },
  { family: "Tangerine", category: "script", weights: [400, 700], italic: false },
  { family: "Marck Script", category: "script", weights: [400], italic: false },
  { family: "Rouge Script", category: "script", weights: [400], italic: false },
  { family: "Merienda", category: "script", weights: [300, 400, 500, 600, 700, 800, 900], italic: false },

  // ============ DECORATIVE / DTF POPULAR (~12) ============
  { family: "Permanent Marker", category: "decorative", weights: [400], italic: false },
  { family: "Bangers", category: "decorative", weights: [400], italic: false },
  { family: "Creepster", category: "decorative", weights: [400], italic: false },
  { family: "Lobster", category: "decorative", weights: [400], italic: false },
  { family: "Lobster Two", category: "decorative", weights: [400, 700], italic: true },
  { family: "Fredoka One", category: "decorative", weights: [400], italic: false },
  { family: "Chewy", category: "decorative", weights: [400], italic: false },
  { family: "Luckiest Guy", category: "decorative", weights: [400], italic: false },
  { family: "Press Start 2P", category: "decorative", weights: [400], italic: false },
  { family: "Special Elite", category: "decorative", weights: [400], italic: false },
  { family: "Orbitron", category: "decorative", weights: [400, 500, 600, 700, 800, 900], italic: false },
  { family: "Vast Shadow", category: "decorative", weights: [400], italic: false },

  // ============ MONOSPACE (~5) ============
  { family: "Roboto Mono", category: "mono", weights: [100, 200, 300, 400, 500, 600, 700], italic: true },
  { family: "Source Code Pro", category: "mono", weights: [200, 300, 400, 500, 600, 700, 800, 900], italic: true },
  { family: "JetBrains Mono", category: "mono", weights: [100, 200, 300, 400, 500, 600, 700, 800], italic: true },
  { family: "Fira Code", category: "mono", weights: [300, 400, 500, 600, 700], italic: false },
  { family: "IBM Plex Mono", category: "mono", weights: [100, 200, 300, 400, 500, 600, 700], italic: true },
];

// ============ FONT LOADING ============

// Track which fonts are loaded
const loadedFonts = new Set<string>();
const loadingFonts = new Map<string, Promise<void>>();

/**
 * Build Google Fonts URL for a font family with specific weights
 */
function buildGoogleFontUrl(family: string, weights: number[], italic: boolean): string {
  const encodedFamily = family.replace(/\s+/g, "+");
  
  if (italic) {
    // Use ital,wght axis for fonts with italic
    const specs = [
      ...weights.map(w => `0,${w}`),
      ...weights.map(w => `1,${w}`),
    ].sort();
    return `https://fonts.googleapis.com/css2?family=${encodedFamily}:ital,wght@${specs.join(";")}&display=swap`;
  } else {
    const wghtSpec = weights.join(";");
    return `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${wghtSpec}&display=swap`;
  }
}

/**
 * Load a font from Google Fonts on demand.
 * Returns immediately if already loaded.
 */
export async function loadFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) return;
  
  // If already loading, wait for it
  const existing = loadingFonts.get(family);
  if (existing) return existing;

  const entry = FONT_CATALOG.find(f => f.family === family);
  if (!entry) {
    console.warn(`Font not in catalog: ${family}`);
    return;
  }

  const promise = (async () => {
    try {
      const url = buildGoogleFontUrl(entry.family, entry.weights, entry.italic);
      
      // Create link element to load the stylesheet
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);

      // Wait for the font to actually be available
      await document.fonts.load(`400 16px "${entry.family}"`);
      
      loadedFonts.add(family);
    } catch (error) {
      console.error(`Failed to load font: ${family}`, error);
    } finally {
      loadingFonts.delete(family);
    }
  })();

  loadingFonts.set(family, promise);
  return promise;
}

/**
 * Check if a font is already loaded
 */
export function isFontLoaded(family: string): boolean {
  return loadedFonts.has(family);
}

// ============ BATCH CATEGORY LOADING ============

const loadedCategories = new Set<FontCategory>();
const loadingCategories = new Map<FontCategory, Promise<void>>();

/**
 * Load all fonts in a category via a single batched Google Fonts URL.
 * Much more efficient than loading individually (~750KB per category).
 * Returns immediately if already loaded.
 */
export async function loadFontCategory(category: FontCategory): Promise<void> {
  if (loadedCategories.has(category)) return;

  const existing = loadingCategories.get(category);
  if (existing) return existing;

  const fonts = getFontsByCategory(category);

  const promise = (async () => {
    try {
      // Build a single batched URL: ?family=Font1:wght@400;700&family=Font2:wght@400...
      const familyParams = fonts.map(f => {
        const encoded = f.family.replace(/\s+/g, "+");
        if (f.italic) {
          const specs = [
            ...f.weights.map(w => `0,${w}`),
            ...f.weights.map(w => `1,${w}`),
          ].sort();
          return `family=${encoded}:ital,wght@${specs.join(";")}`;
        } else {
          return `family=${encoded}:wght@${f.weights.join(";")}`;
        }
      });

      const url = `https://fonts.googleapis.com/css2?${familyParams.join("&")}&display=swap`;

      // Add single stylesheet
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);

      // Wait for all fonts to be ready (with timeout)
      const fontPromises = fonts.map(f =>
        document.fonts.load(`400 16px "${f.family}"`).catch(() => {})
      );
      await Promise.allSettled(fontPromises);

      // Mark all as loaded
      for (const f of fonts) {
        loadedFonts.add(f.family);
        loadingFonts.delete(f.family);
      }
      loadedCategories.add(category);
    } catch (error) {
      console.error(`Failed to batch load category: ${category}`, error);
    } finally {
      loadingCategories.delete(category);
    }
  })();

  loadingCategories.set(category, promise);
  return promise;
}

/**
 * Check if a category's fonts are all loaded
 */
export function isCategoryLoaded(category: FontCategory): boolean {
  return loadedCategories.has(category);
}

/**
 * Get fonts by category
 */
export function getFontsByCategory(category: FontCategory): FontEntry[] {
  return FONT_CATALOG.filter(f => f.category === category);
}

/**
 * Search fonts by name
 */
export function searchFonts(query: string): FontEntry[] {
  const lower = query.toLowerCase();
  return FONT_CATALOG.filter(f => f.family.toLowerCase().includes(lower));
}
