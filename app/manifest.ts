import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quality Code',
    short_name: 'QualityCode',
    description: 'Code Made Clear — AI-powered code analysis, execution flows, and quality review.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#a78bfa',
    icons: [
      {
        src: '/api/icon/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/api/icon/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
