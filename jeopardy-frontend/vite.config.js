import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Cho phép truy cập từ mạng LAN
    port: 5173,
    strictPort: true,
    cors: true,
    // Cho phép hot reload qua network
    watch: {
      usePolling: true,
    },
  },
})
