import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Honour an externally assigned port (parallel dev sessions); 5173 default.
  server: { port: Number(process.env.PORT) || 5173 },
})
