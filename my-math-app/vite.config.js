import { defineConfig } from 'vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    sourcemap: false, 
    minify: 'esbuild', 
  },
  plugins: [
    // 🌟 [추가됨] 오프라인 PWA 앱 세팅
    VitePWA({
      registerType: 'autoUpdate', // 앱이 켜질 때 백그라운드에서 자동 업데이트
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // HTML, JS, CSS를 폰/PC에 영구 저장!
      },
      manifest: {
        name: '2022 개정교육과정 수학 성취기준 매칭 시스템',
        short_name: '수학매칭앱',
        description: '오프라인 분할점수 산출 및 성취기준 분석 도구',
        theme_color: '#1e3a8a',
        background_color: '#f8fafc',
        display: 'standalone', // 인터넷 창이 아니라 진짜 앱처럼 열리게 함
      }
    }),
    
    // 🔒 [유지] 코드 암호화 세팅
    obfuscatorPlugin({
      options: {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        debugProtection: false, 
        stringArray: true,
        stringArrayEncoding: ['base64'],
      },
    }),
  ],
});