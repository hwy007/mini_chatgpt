// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 确保 Vite 知道如何处理 PostCSS/Tailwind
  css: {
    postcss: './postcss.config.js',
  },
});