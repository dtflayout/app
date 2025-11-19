import { Outseta } from '@outseta/toolkit';

// Initialize Outseta client with environment variables
const outsetaClient = new Outseta({
  domain: import.meta.env.VITE_OUTSETA_DOMAIN,
});

// Configure API credentials if needed for server-side operations
export const outsetaConfig = {
  domain: import.meta.env.VITE_OUTSETA_DOMAIN,
  apiKey: import.meta.env.VITE_OUTSETA_API_KEY,
  apiSecret: import.meta.env.VITE_OUTSETA_API_SECRET,
};

export default outsetaClient;
