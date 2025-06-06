/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
      // Allow builds to complete even with TypeScript errors during development
      ignoreBuildErrors: process.env.NODE_ENV === 'development',
    },
    eslint: {
      // Allow builds to complete even with ESLint errors during development
      ignoreDuringBuilds: process.env.NODE_ENV === 'development',
    },
    experimental: {
      serverComponentsExternalPackages: ['@prisma/client'],
    },
    images: {
      domains: [
        'export-download.canva.com',
        'drive.google.com',
        'lh3.googleusercontent.com',
      ],
    },
    env: {
      CUSTOM_KEY: process.env.CUSTOM_KEY,
    },
    // API routes configuration for backend/agents proxying
    async rewrites() {
      const backendUrl = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
      const agentsUrl = process.env.AGENTS_URL || 'http://localhost:8000';

      return [
        // Proxy for AI agent services
        {
          source: '/api/agents/:path*',
          destination: `${agentsUrl}/:path*`,
        },
        // Specific proxies for backend services to avoid catching /api/auth
        {
          source: '/api/events/:path*',
          destination: `${backendUrl}/api/events/:path*`,
        },
        {
          source: '/api/workflow/:path*',
          destination: `${backendUrl}/api/workflow/:path*`,
        },
        {
          source: '/api/health',
          destination: `${backendUrl}/api/health`,
        },
      ];
    },
    // Headers for CORS and security
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value:
                'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
            },
          ],
        },
      ];
    },
  };
  
  module.exports = nextConfig;