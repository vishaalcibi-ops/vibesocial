import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/__/auth': {
        target: 'https://vibesocial-app-906a8.firebaseapp.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
