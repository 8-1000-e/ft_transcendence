<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ title: string; subtitle?: string }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let raf = 0
let onMove: ((e: MouseEvent) => void) | null = null
let onResize: (() => void) | null = null

onMounted(() => {
  const c = canvas.value
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return

  // Reduced-motion: the canvas is purely decorative, so skip the rAF loop and listeners.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  let w = 0
  let h = 0
  let dpr = 1
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = window.innerWidth
    h = window.innerHeight
    c.width = Math.round(w * dpr)
    c.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  onResize = resize
  window.addEventListener('resize', resize)

  const mouse = { x: w / 2, y: h * 0.42 }
  const cur = { x: w / 2, y: h * 0.42 }
  onMove = (e: MouseEvent) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
  }
  window.addEventListener('mousemove', onMove)

  const gap = 28
  const reach = 460
  const draw = () => {
    cur.x += (mouse.x - cur.x) * 0.09
    cur.y += (mouse.y - cur.y) * 0.09
    const t = performance.now() / 1000
    ctx.clearRect(0, 0, w, h)
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        const dx = x - cur.x
        const dy = y - cur.y
        const d = Math.sqrt(dx * dx + dy * dy)
        let infl = 1 - d / reach
        if (infl < 0) infl = 0
        const m = infl * infl
        const wave = Math.sin(d * 0.04 - t * 3.4)
        const a = 0.07 + (wave * 0.5 + 0.5) * 0.9 * m
        const r = Math.max(0.5, 1.4 + wave * 2.8 * m)
        const push = wave * 9 * m
        const ux = d > 0 ? dx / d : 0
        const uy = d > 0 ? dy / d : 0
        const lum = Math.round(165 + 90 * m)
        ctx.beginPath()
        ctx.arc(x + ux * push, y + uy * push, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${lum},${lum},${lum + 6},${a})`
        ctx.fill()
      }
    }
    raf = requestAnimationFrame(draw)
  }
  raf = requestAnimationFrame(draw)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (onMove) window.removeEventListener('mousemove', onMove)
  if (onResize) window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="ftp-page">
    <canvas ref="canvas" class="ftp-canvas" aria-hidden="true"></canvas>
    <div class="ftp-glow"></div>

    <div class="ftp-center">
      <div class="ftp-brand">
        <span class="ftp-brand-icon">
          <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 16.5 L9 10.5 L13 14.5 L21 6.5"
              stroke="#8C97F7"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M15.5 6.5 H21 V12"
              stroke="#8C97F7"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="ftp-wordmark"
          ><span style="color: #f4f4f2">ft</span
          ><span style="color: #8c97f7">_hub</span></span
        >
      </div>

      <div class="ftp-card-wrap">
        <div class="ftp-card-glow"></div>
        <div class="ftp-card">
          <div class="ftp-sheen"><div class="ftp-sheen-move"></div></div>

          <div class="ftp-card-head">
            <h1 class="ftp-title">{{ title }}</h1>
          </div>
          <p v-if="subtitle" class="ftp-subtitle">{{ subtitle }}</p>

          <slot />
        </div>
      </div>

      <p class="ftp-foot"><slot name="footer" /></p>
    </div>
  </div>
</template>
