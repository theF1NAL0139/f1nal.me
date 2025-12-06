import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  base: '/',

  resolve: {
    alias: {
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },

  optimizeDeps: {
    include: ['pdfjs-dist'], 
  },

  build: {
    chunkSizeWarningLimit: 1600, 
    target: 'esnext', 
    commonjsOptions: {
      include: [/pdfjs-dist/, /node_modules/],
      transformMixedEsModules: true,
    }
  }
})