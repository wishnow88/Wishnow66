/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['api.qrserver.com'],
  },
  // Untuk Vercel
  output: 'standalone',
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;