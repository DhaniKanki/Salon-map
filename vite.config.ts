import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/salon-map/',
  plugins: [react()],
  preview: {
    allowedHosts: true,
  },
})
