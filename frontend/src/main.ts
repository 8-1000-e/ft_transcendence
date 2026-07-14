import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { t, locale } from './i18n'

async function bootstrap() {
  const app = createApp(App)
  app.use(createPinia())
  // Global $t so every template can translate without a per-component import.
  app.config.globalProperties.$t = t
  document.documentElement.lang = locale.value

  const auth = useAuthStore()
  await auth.tryRestoreSession()

  app.use(router)
  app.mount('#app')
}

void bootstrap()
