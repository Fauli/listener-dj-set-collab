/**
 * API configuration for client-side requests
 * Automatically uses the correct URL based on environment
 */

// Base URL for API requests
// In production: uses current domain
// In development: uses localhost:3000
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return import.meta.env.PROD ? window.location.origin : 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
