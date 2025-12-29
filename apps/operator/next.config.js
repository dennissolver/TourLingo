/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@tourlingo/ui',
    '@tourlingo/api',
    '@tourlingo/audio',
    '@tourlingo/translation',
    '@tourlingo/types',
  ],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
