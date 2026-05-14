/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', process.env.NEXT_PUBLIC_APP_URL].filter(Boolean),
    },
  },
  images: {
    domains: [
      'res.cloudinary.com',
      'lh3.googleusercontent.com',
      'images.unsplash.com',
      's3.amazonaws.com',
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
