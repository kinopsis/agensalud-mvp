/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost', 'agendia.torrecentral.com', 'evo.torrecentral.com'],
  },
  
  // Coolify-specific configuration
  output: 'standalone',
  
  // Security headers for Coolify deployment
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.openai.com wss://*.supabase.co https://evo.torrecentral.com; frame-ancestors 'none';",
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://agentsalud.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      },
    ];
  },
  
  // Redirects for Coolify
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/health',
        destination: '/api/health',
        permanent: false,
      },
    ];
  },
  
  // Rewrites for Evolution API integration
  async rewrites() {
    return [
      {
        source: '/evolution/:path*',
        destination: 'https://evolution.agentsalud.com/:path*',
      },
    ];
  },
  
  // Environment variables validation
  env: {
    DEPLOYMENT_PLATFORM: 'coolify',
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Webpack configuration for Coolify
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize for production builds
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all';
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        commons: {
          name: 'commons',
          chunks: 'all',
          minChunks: 2,
        },
      };
    }
    
    return config;
  },
  
  // Performance optimizations for Coolify
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

module.exports = nextConfig
