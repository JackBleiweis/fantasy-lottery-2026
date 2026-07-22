/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Phaser ships browser-only code; ensure it is only bundled client-side.
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
