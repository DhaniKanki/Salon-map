import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Salon-map/',
  plugins: [react()],
  preview: {
    allowedHosts: true,
  },
})
