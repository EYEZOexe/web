import type { NextConfig } from "next";

// Validate environment variables at build time
import './src/lib/env'

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@repo/ui"],
  
  // Runtime configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Image domains (for future use)
  images: {
    domains: [
      'localhost',
      'lh3.googleusercontent.com', // Google avatars
      'avatars.githubusercontent.com', // GitHub avatars
    ],
  },
}

export default nextConfig;
