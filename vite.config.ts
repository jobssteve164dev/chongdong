import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'path';

export default defineConfig(async ({ command }) => {
  const plugins = [react()];
  if (command === 'serve') {
    plugins.push(...await electron({
      main: {
        entry: path.resolve(__dirname, 'src/main/index.ts'),
        vite: { build: { outDir: path.resolve(__dirname, 'dist/main') } }
      },
      preload: {
        input: path.resolve(__dirname, 'src/preload/index.ts'),
        vite: { build: { outDir: path.resolve(__dirname, 'dist/preload') } },
        onstart({ reload }) {
          reload();
        },
      }
    }));
  }

  return {
    plugins,
    root: 'src/renderer',
    base: './',
    build: {
      outDir: path.join(__dirname, 'dist', 'renderer'),
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src', 'renderer'),
        '@/shared': path.resolve(__dirname, 'src', 'shared'),
      },
    },
  };
});
