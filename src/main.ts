import '@fontsource-variable/inter'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

async function bootstrap() {
  // Mount /staff/* routes in Vite development mode only so kiosk and staff can share
  // same-origin localStorage preview before Supabase is configured.
  // Production kiosk builds tree-shake this branch completely; deploy staff via `npm run build:staff`.
  if (import.meta.env.DEV) {
    const { mountDevStaffRoutes } = await import('./router/devStaff')
    mountDevStaffRoutes(router)
  }

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}

void bootstrap()
