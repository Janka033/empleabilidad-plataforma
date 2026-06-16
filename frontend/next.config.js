/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  distDir: '.next-build',
  typescript: {
    ignoreBuildErrors: true,  // ← agregar esto
  },
};

module.exports = nextConfig;
