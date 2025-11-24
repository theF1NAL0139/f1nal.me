import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/github.com/theF1NAL0139/f1nal.me/', // <-- Важно: имя репозитория со слешами
})
