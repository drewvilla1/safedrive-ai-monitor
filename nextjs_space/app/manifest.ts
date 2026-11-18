import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SafeDrive AI Monitor',
    short_name: 'SafeDrive',
    description: 'AI-assisted distracted driving safety monitoring system',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0f3f7',
    theme_color: '#1a3a8a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
