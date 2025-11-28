/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Handle node modules that need to be excluded from client bundle
    config.externals = [...(config.externals || []), { 'sqlite3': 'sqlite3' }];
    return config;
  },
}

module.exports = nextConfig