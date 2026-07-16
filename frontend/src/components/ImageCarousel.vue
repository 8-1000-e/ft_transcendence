<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ images: string[]; alt?: string }>()
const i = ref(0)
// Track failed srcs reactively — mutating one <img>'s style imperatively left it
// display:none for every later (valid) slide since the <img> element is reused.
const failed = ref<string[]>([])

// Reset only when the image set actually changes, not on every re-render (the prop is often a fresh array literal).
watch(
  () => props.images.join('|'),
  () => {
    i.value = 0
    failed.value = []
  },
)

function onImgError(src: string) {
  if (!failed.value.includes(src)) failed.value.push(src)
}

function go(n: number) {
  const len = props.images.length
  i.value = (n + len) % len
}
</script>

<template>
  <div v-if="images.length" class="carousel" :class="{ single: images.length === 1 }">
    <div class="track">
      <img v-if="!failed.includes(images[i])" :src="images[i]" :alt="alt || 'attached image'" @error="onImgError(images[i])" />
      <span v-else class="broken" role="img" :aria-label="alt || 'image unavailable'">
        <svg aria-hidden="true" focusable="false" width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 5h18v14H3z" stroke="currentColor" stroke-width="1.5"/><path d="m3 16 5-4 4 3 3-3 4 3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m4 4 16 16" stroke="currentColor" stroke-width="1.5"/></svg>
      </span>
    </div>

    <template v-if="images.length > 1">
      <button class="nav prev" aria-label="Previous image" @click.prevent="go(i - 1)">
        <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <button class="nav next" aria-label="Next image" @click.prevent="go(i + 1)">
        <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <span class="count">{{ i + 1 }}/{{ images.length }}</span>
      <div class="dots">
        <button
          v-for="n in images.length"
          :key="n"
          class="dot"
          :class="{ on: n - 1 === i }"
          :aria-label="`Go to image ${n}`"
          @click.prevent="go(n - 1)"
        ></button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.carousel {
  position: relative;
  margin-top: 12px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--border-soft);
  background: #0c0c10;
}
.track {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 460px;
}
.track img {
  max-width: 100%;
  max-height: 460px;
  object-fit: contain;
  display: block;
}
.broken {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 44px;
  color: var(--muted);
}
.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 8, 10, 0.72);
  backdrop-filter: blur(6px);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s;
}
.nav:hover {
  background: rgba(8, 8, 10, 0.92);
}
.nav.prev {
  left: 10px;
}
.nav.next {
  right: 10px;
}
.count {
  position: absolute;
  top: 10px;
  right: 12px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: rgba(8, 8, 10, 0.72);
  padding: 3px 9px;
  border-radius: 999px;
}
.dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0;
}
.dot.on {
  background: #fff;
  width: 18px;
  border-radius: 999px;
}
</style>
