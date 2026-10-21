import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      'e2e/**',
      // This metadata helper uses node:test in its standalone workflow.
      'scripts/check-css-studio-image-contract.test.mjs',
    ],
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')

          if (normalizedId.includes('/node_modules/react-router-dom/')) return 'router'
          if (normalizedId.includes('/node_modules/react-helmet-async/')) return 'helmet'
          if (normalizedId.includes('/node_modules/react-icons/')) return 'icons'
          if (normalizedId.includes('/node_modules/@sanity/client/')) return 'sanity'
          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/')
          ) {
            return 'react'
          }
        },
      },
    },
  },
})
