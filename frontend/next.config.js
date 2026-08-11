/** @type {import('next').NextConfig} */

// The backend URL — read at server startup, NOT baked at build time.
// On Render: set BACKEND_URL (or NEXT_PUBLIC_API_BASE_URL) in env vars.
// Locally: set in .env.local
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://talentbase-ai-platform.onrender.com";

const nextConfig = {
  reactStrictMode: true,

  // Proxy all /api/* requests to the FastAPI backend.
  // The browser never talks to the backend directly → no CORS needed.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
