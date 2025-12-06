import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Важно для Github Pages или простого хостинга, чтобы пути были относительными
  base: '/',
  chunkSizeWarningLimit: 1600, // Чтобы не ругался на большие чанки JS

  resolve: {
    alias: {
      // ПРИНУДИТЕЛЬНО указываем путь к единственной версии React.
      // Это лечит ошибку "Invalid hook call", если есть дубликаты.
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },

  optimizeDeps: {
    // Помогает Vite быстрее обработать pdfjs-dist при первом запуске
    include: ['pdfjs-dist'], 
  },

  build: {
    // PDF.js использует современные фичи (Top-level await), 
    // поэтому лучше ставить esnext или es2022
    target: 'esnext', 
    commonjsOptions: {
      include: [/pdfjs-dist/, /node_modules/],
      transformMixedEsModules: true, // Дополнительная подстраховка для смешанных модулей
    }
  }
})