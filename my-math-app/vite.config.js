import { defineConfig } from 'vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  build: {
    sourcemap: false, 
    minify: 'esbuild', 
  },
  plugins: [
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