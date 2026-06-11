import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

async function bootstrap() {
  const app = createApp(App)
  app.use(createPinia())

  const auth = useAuthStore()
  await auth.tryRestoreSession()

  app.use(router)
  app.mount('#app')
}

void bootstrap()
