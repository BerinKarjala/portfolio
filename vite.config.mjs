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
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          sanity: ['@sanity/client', '@sanity/image-url', '@sanity/block-content-to-react'],
          helmet: ['react-helmet-async'],
          icons: ['react-icons'],
        },
      },
    },
  },
})
