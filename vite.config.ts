import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Используем точку и слэш. Это значит "ищи файлы в текущей папке".
  // Это работает везде: и на f1nal.me, и на f1nal-me, и локально.
  base: '/f1nal.me/', 
})