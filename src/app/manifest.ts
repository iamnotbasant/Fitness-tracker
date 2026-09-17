import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fitness Tracker',
    short_name: 'Fitness',
    description: 'Track your workouts, routines, sets, and progressive overload.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/placeholder-logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/placeholder-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
