<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{ title: string; updated?: string }>()

const router = useRouter()

function goBack() {
  // Back to where they came from; if deep-linked (no history), fall back to root.
  if (window.history.length > 1) router.back()
  else router.push('/')
}

function onBodyClick(e: MouseEvent) {
  const a = (e.target as HTMLElement).closest('a')
  if (!a) return
  const href = a.getAttribute('href') ?? ''
  // Only intercept same-app absolute paths; leave external/mailto/anchors alone.
  if (!href.startsWith('/') || href.startsWith('//')) return
  e.preventDefault()
  void router.push(href)
}
</script>

<template>
  <div class="ftp-page">
    <div class="ftp-glow"></div>

    <header class="legal-bar">
      <RouterLink :to="{ name: 'feed' }" class="brand">
        <span class="brand-mark">
          <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 16.5 L9 10.5 L13 14.5 L21 6.5" stroke="#8C97F7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M15.5 6.5 H21 V12" stroke="#8C97F7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="brand-word">ft<span class="brand-accent">_hub</span></span>
      </RouterLink>
      <button class="back" @click="goBack">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" /></svg>
        {{ $t('legal.back') }}
      </button>
    </header>

    <div class="wrap">
      <article class="doc">
        <h1 class="doc-title">{{ title }}</h1>
        <p v-if="updated" class="doc-updated">{{ $t('legal.lastUpdated') }}: {{ updated }}</p>
        <div class="doc-body" @click="onBodyClick">
          <slot />
        </div>
      </article>

      <p class="foot">
        <RouterLink :to="{ name: 'privacy' }" class="foot-link">{{ $t('legal.foot.privacy') }}</RouterLink>
        <span class="foot-dot">·</span>
        <RouterLink :to="{ name: 'terms' }" class="foot-link">{{ $t('legal.foot.terms') }}</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.legal-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 60px;
  padding: 0 22px;
  border-bottom: 1px solid #1c1c22;
  background: rgba(10, 10, 12, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.wrap {
  position: relative;
  z-index: 5;
  max-width: 680px;
  margin: 0 auto;
  padding: 34px 22px 60px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
}
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(110, 123, 242, 0.14);
  border: 1px solid rgba(110, 123, 242, 0.32);
}
.brand-word {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #f4f4f2;
}
.brand-accent {
  color: #8c97f7;
}
.back {
  display: flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: none;
  color: #74747e;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.back:hover {
  color: #8c97f7;
}
.doc {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 17, 21, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 34px 34px 30px;
}
.doc-title {
  font-size: 27px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #f6f6f7;
  margin: 0 0 6px;
}
.doc-updated {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #74747e;
  margin: 0 0 26px;
}
.doc-body {
  color: #c2c2c8;
  font-size: 14.5px;
  line-height: 1.7;
}
.doc-body :deep(h2) {
  font-size: 15px;
  font-weight: 700;
  color: #f0f0f2;
  letter-spacing: 0.01em;
  margin: 28px 0 10px;
}
.doc-body :deep(h2:first-child) {
  margin-top: 0;
}
.doc-body :deep(p) {
  margin: 0 0 14px;
}
.doc-body :deep(ul) {
  margin: 0 0 14px;
  padding-left: 20px;
}
.doc-body :deep(li) {
  margin: 0 0 7px;
}
.doc-body :deep(strong) {
  color: #ededee;
  font-weight: 600;
}
.doc-body :deep(a) {
  color: #8c97f7;
  text-decoration: none;
}
.doc-body :deep(a:hover) {
  color: #aab2ff;
}
.doc-body :deep(code) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: #cdd3ff;
  background: rgba(110, 123, 242, 0.1);
  border: 1px solid rgba(110, 123, 242, 0.2);
  border-radius: 5px;
  padding: 1px 5px;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 26px 0 0;
}
.foot-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #74747e;
  text-decoration: none;
}
.foot-link:hover {
  color: #8c97f7;
}
.foot-dot {
  color: #3a3a44;
}
</style>
