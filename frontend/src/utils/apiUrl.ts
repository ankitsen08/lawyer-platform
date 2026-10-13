/**
 * Dynamically resolves the API and WebSocket server URL.
 * In production on a deployed domain (like lawyercomparison.us), returns empty string
 * so requests use relative paths (/api/...) and are proxied seamlessly by Next.js rewrites.
 * In local development, falls back to http://localhost:3001.
 */
export function getServerUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '';
    }
    return 'http://localhost:3001';
  }
  return process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3001';
}
