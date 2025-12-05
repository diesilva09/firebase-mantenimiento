
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: 'https',
        hostname: 'scontent.feoh3-1.fna.fbcdn.net',
        port: '',
        pathname: '/**',
      }
    ],
  },
  devIndicators: ( {
    allowedDevOrigins: ['https://*.cluster-hkcruqmgzbd2aqcdnktmz6k7ba.cloudworkstations.dev'],
  } as unknown ) as NextConfig['devIndicators'],
};

export default nextConfig;
