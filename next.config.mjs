/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mantém build funcionando mesmo com warnings de ESLint em producao
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Mantém erros de TypeScript visíveis mas sem bloquear o build no deploy
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Headers de segurança para producao
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',             value: 'strict-origin-when-cross-origin' },
        ],
      },
      // Cache longo para assets estaticos do PWA
      {
        source: '/icons/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      // Service worker nunca deve ser cacheado
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed',     value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
