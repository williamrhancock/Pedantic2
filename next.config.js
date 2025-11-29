/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['reactflow'],
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