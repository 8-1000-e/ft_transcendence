<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="auth-page">
    <div class="auth-center">
      <div class="auth-brand">
        <span class="brand-mark">H</span>
        <span class="brand-word">Hub<span class="brand-accent">42</span></span>
      </div>

      <div class="card auth-card">
        <div class="auth-head">
          <h1 class="auth-title">{{ title }}</h1>
          <p v-if="subtitle" class="auth-subtitle">{{ subtitle }}</p>
        </div>

        <slot />
      </div>

      <p class="auth-foot"><slot name="footer" /></p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
}
.auth-center {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  font-weight: 800;
  font-size: 15px;
}
.brand-word {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}
.brand-accent {
  color: var(--color-accent);
}

.auth-card {
  width: 100%;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.auth-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.auth-title {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0;
}
.auth-subtitle {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-muted);
  margin: 0;
}

.auth-foot {
  margin: 20px 0 0;
  font-size: 13px;
  color: var(--color-text-dim);
  text-align: center;
}
</style>
