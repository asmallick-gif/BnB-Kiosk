import '@fontsource-variable/inter'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import staffRouter from './router/staff'

const app = createApp(App)

app.use(createPinia())
app.use(staffRouter)

app.mount('#app')
