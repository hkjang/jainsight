/**
 * Centralized API Configuration
 * 
 * All API calls should use these utilities to ensure consistent
 * URL handling across the application.
 * 
 * The Next.js rewrites in next.config.js proxies /api/* requests
 * to the backend server, so we use relative URLs in production.
 */

// API base URL - uses relative path for Next.js proxy
// The proxy is configured in next.config.js to forward /api/* to the backend
export const API_BASE = '/api';

// For cases where absolute URL is needed (e.g., external links, OpenAPI docs)
export const getAbsoluteApiUrl = (path: string = '') => {
  // In browser, use current origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api${path}`;
  }
  // In SSR, use environment variable or default
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api${path}`;
};

// Helper to build API endpoint URLs
export const apiUrl = (endpoint: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE}/${cleanEndpoint}`;
};

// Fetch wrapper with auth token
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(apiUrl(endpoint), {
    ...options,
    headers,
  });
};
