const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

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
  },
};

module.exports = withPWA(nextConfig);
