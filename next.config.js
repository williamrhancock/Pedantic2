/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  transpilePackages: ['reactflow'],
  images: {
    unoptimized: true, // Disable Next.js image optimization in both dev and prod
  },
  eslint: {
    // Disable the img element warning since we're using unoptimized images
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Handle node modules that need to be excluded from client bundle
    config.externals = [...(config.externals || []), { 'sqlite3': 'sqlite3' }];
    
    // Fix for reactflow - ensure it's not processed on server
    if (isServer) {
      config.externals.push('reactflow');
    }
    
    // Explicitly resolve path aliases (fixes Docker build on Windows)
    // Set '@' to point to src directory - webpack will resolve @/lib/trpc-provider to src/lib/trpc-provider
    const srcPath = path.resolve(__dirname, 'src')
    
    // Ensure resolve configuration exists
    if (!config.resolve) {
      config.resolve = {}
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {}
    }
    
    // Set '@' alias to src - this matches tsconfig.json "@/*": ["./src/*"]
    // Webpack will automatically resolve @/lib/trpc-provider to src/lib/trpc-provider
    config.resolve.alias['@'] = srcPath
    
    return config;
  },
}

module.exports = nextConfig