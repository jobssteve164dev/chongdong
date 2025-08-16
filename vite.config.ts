import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: path.join(__dirname, 'dist', 'renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(__dirname, 'src', 'renderer', 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src', 'renderer'),
      '@/shared': path.resolve(__dirname, 'src', 'shared'),
      '@/components': path.resolve(__dirname, 'src', 'renderer', 'components'),
      '@/pages': path.resolve(__dirname, 'src', 'renderer', 'pages'),
      '@/utils': path.resolve(__dirname, 'src', 'renderer', 'utils'),
      '@/hooks': path.resolve(__dirname, 'src', 'renderer', 'hooks'),
      '@/types': path.resolve(__dirname, 'src', 'shared', 'types'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});

