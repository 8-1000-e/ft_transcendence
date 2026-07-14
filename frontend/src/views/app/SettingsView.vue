<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { useAuthStore } from '@/stores/auth'
import { useI18n, type Locale } from '@/i18n'
import Modal from '@/components/Modal.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t, locale, setLocale, LOCALES } = useI18n()

// Surface the result of the 42-link round-trip (see AuthController.ftCallback).
onMounted(() => {
  if (route.query.linked === '1') message.value = t('settings.linked.done')
  else if (route.query.link_error) {
    error.value = t('settings.linked.error')
  }
  if (route.query.linked || route.query.link_error) {
    void router.replace({ query: {} })
  }
})

const name = ref(auth.user?.name ?? '')
const savingName = ref(false)
const message = ref('')
const error = ref('')

const memberEmail = computed(() => auth.user?.email ?? '')
const has42 = computed(() => !!auth.user?.has42)
const hasPassword = computed(() => !!auth.user?.hasPassword)
const login = computed(() => auth.user?.login ?? '')

// Password (set for 42-only accounts, change for email accounts)
const showPassword = ref(false)
const curPw = ref('')
const newPw = ref('')
const pwSaving = ref(false)
const pwError = ref('')

function openPassword() {
  curPw.value = ''
  newPw.value = ''
  pwError.value = ''
  showPassword.value = true
}
async function submitPassword() {
  if (newPw.value.length < 8) {
    pwError.value = t('settings.pw.tooShort')
    return
  }
  pwSaving.value = true
  pwError.value = ''
  const wasChange = hasPassword.value
  try {
    await api.post<{ message: string }>(ROUTES.users.password, {
      currentPassword: wasChange ? curPw.value : undefined,
      newPassword: newPw.value,
    })
    showPassword.value = false
    if (wasChange) {
      // A password change revokes every session server-side (tokenVersion bump + refresh-token wipe) → drop this one too and send the user to log in.
      auth.clear()
      await router.push({ path: '/login', query: { pwchanged: '1' } })
      return
    }
    await auth.fetchMe()
    message.value = t('settings.pw.setDone')
  } catch (e) {
    pwError.value = (e as { message?: string }).message ?? 'Failed'
  } finally {
    pwSaving.value = false
  }
}

const showDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const dataBusy = ref(false)
async function downloadData() {
  dataBusy.value = true
  message.value = ''
  error.value = ''
  try {
    const data = await api.get<unknown>(ROUTES.users.export)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ft_hub_data.json'
    a.click()
    URL.revokeObjectURL(url)
    message.value = t('settings.data.done')
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed'
  } finally {
    dataBusy.value = false
  }
}

async function saveName() {
  if (!name.value.trim() || savingName.value) return
  message.value = ''
  error.value = ''
  savingName.value = true
  try {
    await api.patch(ROUTES.users.updateMe, { name: name.value.trim() })
    await auth.fetchMe()
    message.value = t('settings.displayName.saved')
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Update failed'
  } finally {
    savingName.value = false
  }
}

// Switch language: apply instantly (optimistic) + persist per-account on the server.
async function changeLanguage(code: Locale) {
  const prev = locale.value
  setLocale(code)
  if (auth.user) auth.user.locale = code
  error.value = ''
  try {
    await api.patch(ROUTES.users.updateMe, { locale: code })
  } catch (e) {
    // Roll back the optimistic switch so client + localStorage don't drift from the server.
    setLocale(prev)
    if (auth.user) auth.user.locale = prev
    error.value = (e as { message?: string }).message ?? 'Update failed'
  }
}

function openDelete() {
  message.value = ''
  error.value = ''
  deleteError.value = ''
  showDelete.value = true
}

function onDeleteClose() {
  if (deleting.value) return
  showDelete.value = false
}

async function confirmDeletion() {
  deleteError.value = ''
  deleting.value = true
  try {
    const res = await api.del<{ message: string }>(ROUTES.users.deleteMe)
    message.value = res?.message ?? 'Deletion scheduled.'
    showDelete.value = false
    await auth.fetchMe()
  } catch (e) {
    deleteError.value = (e as { message?: string }).message ?? 'Failed'
  } finally {
    deleting.value = false
  }
}

async function cancelDeletion() {
  message.value = ''
  error.value = ''
  try {
    const res = await api.post<{ message: string }>(ROUTES.users.cancelDelete)
    message.value = res?.message ?? 'Deletion cancelled.'
    await auth.fetchMe()
  } catch (e) {
    error.value = (e as { message?: string }).message ?? 'Failed'
  }
}

async function logout() {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <section>
    <h1 class="h1">{{ $t('settings.title') }}</h1>
    <p class="eyebrow">// {{ $t('settings.sub') }}</p>

    <div class="set-wrap">
      <p v-if="message" class="ok-banner">{{ message }}</p>
      <p v-if="error" class="err" style="margin: 0 0 12px">{{ error }}</p>

      <div class="set-card">
        <h2 class="set-h">{{ $t('settings.42.h') }}</h2>
        <p class="set-sub">{{ $t('settings.42.desc') }}</p>
        <div v-if="has42" class="set-row">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
          <div class="set-row-main">
            <div class="set-row-t">{{ $t('settings.42.connectedAs', { name: auth.user?.name ?? '' }) }}</div>
            <div class="set-row-x">{{ auth.user?.campus ? '42 ' + auth.user.campus : $t('settings.42.verified') }}</div>
          </div>
          <span class="set-status on"><span class="badge42-sq" style="width: 16px; height: 16px">42</span>{{ $t('settings.42.linked') }}</span>
        </div>
        <div v-else class="set-row">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
          <div class="set-row-main">
            <div class="set-row-t">{{ $t('settings.42.notLinked') }}</div>
            <div class="set-row-x">{{ $t('settings.42.notLinkedDesc') }}</div>
          </div>
          <button class="sbtn primary" @click="auth.link42()"><span class="badge42-sq" style="width: 16px; height: 16px">42</span>{{ $t('common.linkYour42') }}</button>
        </div>
      </div>

      <div class="set-card">
        <h2 class="set-h">{{ $t('settings.account.h') }}</h2>
        <p class="set-sub">{{ $t('settings.account.desc') }}</p>

        <div v-if="login" class="set-row">
          <span class="ic"><span class="badge42-sq" style="width: 18px; height: 18px">42</span></span>
          <div class="set-row-main">
            <div class="set-row-t">@{{ login }}</div>
            <div class="set-row-x">{{ $t('settings.handle.desc') }}</div>
          </div>
        </div>

        <div class="set-row">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.5" stroke="currentColor" stroke-width="1.7" /><path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /></svg></span>
          <div class="set-row-main">
            <div class="set-row-t">{{ $t('settings.displayName') }}</div>
            <input v-model="name" class="field name-field" :aria-label="$t('settings.displayName')" @keyup.enter="saveName" />
            <div class="set-row-x">{{ $t('settings.displayName.desc') }}</div>
          </div>
          <button class="sbtn primary" :disabled="savingName || !name.trim()" @click="saveName">
            {{ savingName ? $t('settings.saving') : $t('common.save') }}
          </button>
        </div>

        <div class="set-row">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.7" /><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.7" /></svg></span>
          <div class="set-row-main">
            <div class="set-row-t">{{ memberEmail }}</div>
            <div class="set-row-x">{{ $t('settings.email') }}</div>
          </div>
        </div>

        <div class="set-row">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.7" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.7" /></svg></span>
          <div class="set-row-main">
            <div class="set-row-t">{{ $t('settings.password') }}</div>
            <div class="set-row-x">{{ hasPassword ? $t('settings.password.change') : $t('settings.password.set') }}</div>
          </div>
          <button class="sbtn" :class="{ primary: !hasPassword }" @click="openPassword">{{ hasPassword ? $t('settings.password.changeBtn') : $t('settings.password.setBtn') }}</button>
        </div>

        <div class="set-row">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /><path d="M10 8l-4 4 4 4M6 12h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
          <div class="set-row-main">
            <div class="set-row-t">{{ $t('settings.session') }}</div>
            <div class="set-row-x">{{ $t('settings.session.desc') }}</div>
          </div>
          <button class="sbtn" @click="logout">{{ $t('settings.logout') }}</button>
        </div>

        <div class="set-row">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
          <div class="set-row-main">
            <div class="set-row-t">{{ $t('settings.data') }}</div>
            <div class="set-row-x">{{ $t('settings.data.desc') }}</div>
          </div>
          <button class="sbtn" :disabled="dataBusy" @click="downloadData">{{ dataBusy ? $t('settings.data.downloading') : $t('settings.data.download') }}</button>
        </div>
      </div>

      <div class="set-card">
        <h2 class="set-h">{{ $t('settings.prefs.h') }}</h2>
        <p class="set-sub">{{ $t('settings.prefs.desc') }}</p>
        <div class="set-row">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" /><path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" stroke="currentColor" stroke-width="1.4" /></svg></span>
          <div class="set-row-main">
            <div class="set-row-t">{{ $t('settings.language') }}</div>
            <div class="set-row-x">{{ $t('settings.language.desc') }}</div>
          </div>
          <div class="langseg">
            <button
              v-for="l in LOCALES"
              :key="l.code"
              :class="{ on: locale === l.code }"
              @click="changeLanguage(l.code)"
            >{{ l.label }}</button>
          </div>
        </div>
        <div class="set-row">
          <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12.8A8 8 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg></span>
          <div class="set-row-main">
            <div class="set-row-t">{{ $t('settings.theme') }}</div>
            <div class="set-row-x">{{ $t('settings.theme.desc') }}</div>
          </div>
          <span class="set-status off">{{ $t('settings.theme.dark') }}</span>
        </div>
      </div>

      <div class="set-card danger">
        <h2 class="set-h d">{{ $t('settings.delete.h') }}</h2>
        <p class="set-sub">{{ $t('settings.delete.desc') }}</p>
        <div class="set-row" style="border: none; padding-bottom: 0">
          <div class="set-row-main">
            <div v-if="auth.user?.pendingDeletion" class="set-row-t" style="color: var(--warn)">
              {{ $t('settings.delete.scheduled') }}
            </div>
          </div>
          <button v-if="auth.user?.pendingDeletion" class="sbtn" @click="cancelDeletion">{{ $t('settings.delete.cancel') }}</button>
          <button class="sbtn danger" @click="openDelete">{{ $t('settings.delete.btn') }}</button>
        </div>
      </div>
    </div>

    <Modal :open="showPassword" :title="hasPassword ? $t('settings.pw.changeTitle') : $t('settings.pw.setTitle')" @close="showPassword = false">
      <p style="margin: 0 0 14px">
        {{ hasPassword ? $t('settings.pw.changeIntro') : $t('settings.pw.setIntro') }}
      </p>
      <div style="display: flex; flex-direction: column; gap: 10px">
        <input
          v-if="hasPassword"
          v-model="curPw"
          type="password"
          class="field"
          :placeholder="$t('settings.pw.current')"
          :aria-label="$t('settings.pw.current')"
          autocomplete="current-password"
        />
        <input
          v-model="newPw"
          type="password"
          class="field"
          :placeholder="$t('settings.pw.new')"
          :aria-label="$t('settings.pw.new')"
          autocomplete="new-password"
          @keyup.enter="submitPassword"
        />
      </div>
      <p v-if="pwError" class="err" style="margin: 10px 0 0">{{ pwError }}</p>
      <template #actions>
        <button class="btn-ghost" style="flex: 1" :disabled="pwSaving" @click="showPassword = false">{{ $t('common.cancel') }}</button>
        <button class="btn-primary" style="flex: 1" :disabled="pwSaving || newPw.length < 8" @click="submitPassword">
          {{ pwSaving ? $t('settings.saving') : hasPassword ? $t('settings.pw.changeTitle') : $t('settings.password.setBtn') }}
        </button>
      </template>
    </Modal>

    <Modal :open="showDelete" :title="$t('settings.delete.confirmTitle')" @close="onDeleteClose">
      <p>{{ $t('settings.delete.confirmBody') }}</p>
      <p v-if="deleteError" class="err">{{ deleteError }}</p>
      <template #actions>
        <button class="btn-ghost" style="flex: 1" :disabled="deleting" @click="onDeleteClose">{{ $t('common.cancel') }}</button>
        <button class="sbtn danger" style="flex: 1; height: 44px; justify-content: center" :disabled="deleting" @click="confirmDeletion">
          {{ deleting ? $t('settings.delete.deleting') : $t('settings.delete.confirmBtn') }}
        </button>
      </template>
    </Modal>
  </section>
</template>

<style scoped>
.name-field {
  height: 34px;
  margin-top: 5px;
  font-size: 13.5px;
  max-width: 280px;
}
.ok-banner {
  color: var(--up);
  font-size: 13px;
  margin: 0 0 12px;
}
.soon-banner {
  color: var(--warn);
  font-size: 13px;
  margin: 0 0 12px;
}
</style>
