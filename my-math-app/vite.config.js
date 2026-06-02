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
        name: '2022 개정교육과정 성취기준 매칭 시스템',
        short_name: '성취기준 매칭앱',
        description: '오프라인 분할점수 산출 및 성취기준 분석 도구',
        theme_color: '#1e3a8a',
        background_color: '#f8fafc',
        display: 'standalone',
        // 👇 이 부분이 추가되어야 브라우저가 앱으로 인정해 줍니다!
        icons: [
          {
            src: 'favicon.svg', // public 폴더에 있는 선생님의 아이콘 파일
            sizes: '192x192 512x512',
            type: 'image/svg+xml'
          }
        ]
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