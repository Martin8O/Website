import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Honour an externally assigned port (parallel dev sessions); 5173 default.
  server: { port: Number(process.env.PORT) || 5173 },
  build: {
    // The canvas world, the Work panel and the L2 3D layer (three + R3F) are
    // code-split (React.lazy), so the per-chunk sizes are intentional, not
    // accidents — quiet the 500 kB warn (the three chunk is ~955 kB raw:
    // three + R3F + GLTFLoader/meshopt decoder/RoomEnvironment for E3b).
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Keep the rarely-changing React runtime in its own long-cache chunk,
        // separate from app code that ships on every deploy.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client'],
        },
      },
    },
  },
})
