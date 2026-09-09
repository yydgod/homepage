import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// base './' + viteSingleFile：将 JS/CSS 全部内联进单个 index.html，
// 保证构建产物可通过 file:// 协议双击直接打开
export default defineConfig({
  base: './',
  plugins: [vue(), viteSingleFile()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
