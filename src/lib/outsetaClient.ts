// Outseta configuration for API calls
// Note: The Outseta SDK is loaded via script tag in index.html
// and accessed through window.Outseta
export const outsetaConfig = {
  domain: import.meta.env.VITE_OUTSETA_DOMAIN,
  apiKey: import.meta.env.VITE_OUTSETA_API_KEY,
  apiSecret: import.meta.env.VITE_OUTSETA_API_SECRET,
};
