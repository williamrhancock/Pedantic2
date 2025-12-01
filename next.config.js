/** @type {import('next').NextConfig} */
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
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
      '@/components': require('path').resolve(__dirname, 'src/components'),
      '@/lib': require('path').resolve(__dirname, 'src/lib'),
      '@/app': require('path').resolve(__dirname, 'src/app'),
    };
    
    return config;
  },
}

module.exports = nextConfig