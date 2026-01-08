/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // On désactive le cache webpack pour forcer la recompilation des routes
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;