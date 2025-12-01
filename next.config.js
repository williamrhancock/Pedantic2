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
    
    return config;
  },
}

module.exports = nextConfig