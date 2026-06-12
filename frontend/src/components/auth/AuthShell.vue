<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-bg">
    <div class="w-full max-w-sm">
      <div class="mb-8 flex items-center gap-3">
        <div
          class="h-11 w-11 rounded-xl bg-black flex items-center justify-center text-accent font-black text-xl border border-border"
        >
          S
        </div>
        <div class="leading-tight">
          <p class="font-semibold">Neo Bank</p>
          <p class="text-sm text-muted">on @solana</p>
        </div>
      </div>

      <div
        class="rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/30"
      >
        <h1 class="text-xl font-semibold mb-1">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-muted mb-5">{{ subtitle }}</p>
        <div :class="subtitle ? '' : 'mt-4'">
          <slot />
        </div>
      </div>

      <div class="mt-6 text-center text-sm text-muted">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
