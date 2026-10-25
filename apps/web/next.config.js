/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'media.discordapp.net' },
    ],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:4000/:path*' }]
  },
}

module.exports = nextConfig
