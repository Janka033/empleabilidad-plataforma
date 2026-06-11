/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  distDir: '.next-build',
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
