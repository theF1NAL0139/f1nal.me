import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import compression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Gzip compression для production
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Сжимать файлы > 1KB
    }),
    // Brotli compression (лучше сжатие)
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
  ],
  
  base: '/',

  resolve: {
    alias: {
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
    exclude: ['pdfjs-dist'], // Исключаем тяжелую библиотеку из pre-bundling
  },

  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Убираем console.log в production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    
    // Chunk splitting для лучшего кэширования
    rollupOptions: {
      output: {
        manualChunks: {
          // Выносим React в отдельный чанк
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Framer Motion отдельно (большая библиотека)
          'vendor-motion': ['framer-motion'],
          // Lucide icons отдельно
          'vendor-icons': ['lucide-react'],
          // PDF viewer отдельно (очень большая)
          'vendor-pdf': ['react-pdf', 'pdfjs-dist'],
        },
        // Оптимизация имен файлов для кэширования
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // Увеличиваем лимит предупреждений
    chunkSizeWarningLimit: 500,
    
    // Генерация source maps только для production отладки
    sourcemap: false,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Оптимизация ассетов
    assetsInlineLimit: 4096, // Инлайним файлы < 4KB как base64
  },

  // Оптимизация dev-сервера
  server: {
    hmr: {
      overlay: true,
    },
  },
})
