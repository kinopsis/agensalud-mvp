/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize chunk loading and reduce hydration issues
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },

  // TypeScript and ESLint configuration for deployment
  typescript: {
    // Ignore TypeScript errors during build for deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint errors during build for deployment
    ignoreDuringBuilds: true,
  },

  // Webpack configuration for better chunk handling
  webpack: (config, { dev, isServer }) => {
    // Optimize chunk splitting in development
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Handle potential module resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },

  // Improve development server stability
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },

  // Handle redirects and rewrites properly
  async redirects() {
    return [
      // No redirects needed - auth routes work correctly with (auth) group
    ];
  },

  // Headers for better caching and security
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
