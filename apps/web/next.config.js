/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export static HTML files (client-side only)
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip type checking during build (types already checked)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Trailing slash for static hosting
  trailingSlash: true,
};

module.exports = nextConfig;
