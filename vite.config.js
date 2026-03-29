import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 👇 Remplace 'gutfeel' par le nom exact de ton repo GitHub
export default defineConfig({
  plugins: [react()],
  base: '/gutfeel/',
})
