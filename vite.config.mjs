import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
