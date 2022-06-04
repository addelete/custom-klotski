import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    apiBaseUrl: JSON.stringify("http://localhost:8088"), // api服务器地址
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  plugins: [react()],
});
