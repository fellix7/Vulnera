import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin API calls in dev; no CORS needed on the server.
    proxy: { '/api': process.env.VITE_API_TARGET ?? 'http://localhost:8787' },
  },
})
