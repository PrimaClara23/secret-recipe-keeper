import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Alias for types directory - resolves to project root/types
      "../../types": path.resolve(__dirname, "../types"),
    },
    dedupe: ['ethers'],
    // Ensure node_modules resolution works for types directory
    preserveSymlinks: false,
  },
  build: {
    commonjsOptions: {
      include: [/types/, /node_modules/],
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto',
    },
    rollupOptions: {
      // Ensure all imports are resolved, don't externalize anything
      external: (id) => {
        // Don't externalize ethers or any types directory imports
        if (id === 'ethers' || id.startsWith('ethers/')) {
          return false;
        }
        return false;
      },
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    include: ['ethers'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
}));
