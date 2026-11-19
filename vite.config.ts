import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

function appTargetPlugin(): Plugin {
  let isStaffMode = false

  return {
    name: 'bnb-app-target',
    config(_userConfig, env) {
      isStaffMode = env.mode === 'staff'
      return {
        build: {
          outDir: isStaffMode ? 'dist-staff' : 'dist',
        },
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const title = isStaffMode ? "Bake'n Brew Staff Portal" : "Bake'n Brew Kiosk"
        let next = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        if (isStaffMode) {
          next = next.replace('/src/main.ts', '/src/staff-main.ts')
        }
        return next
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [appTargetPlugin(), vue(), vueJsx(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
