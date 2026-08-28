import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  // Optimisations de build
  compiler: {
    // Supprimer les console.log en production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Optimisations d'images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
      // Ajoutez ici vos autres domaines d'images
    ],
  },
  
  
  // Mode expérimental pour de meilleures performances
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['date-fns', 'react-dnd'],
  },
  
  // Compression
  compress: true,
  
  // Production source maps (désactivé pour build plus rapide)
  productionBrowserSourceMaps: false,
};

export default nextConfig;
