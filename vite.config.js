import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 상대 경로로 정적 에셋 로드 지원
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
