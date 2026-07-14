<script setup lang="ts">
// Shared dialog teleported to <body> (escapes ancestor stacking contexts). Focus-trapped with restore,
// Escape/backdrop close, ref-counted body-scroll lock; parent owns `open` and it never self-closes.
import { ref, watch, nextTick, onBeforeUnmount, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    backdropClose?: boolean
  }>(),
  { backdropClose: true },
)

const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const dialogRef = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null
let locked = false

/* Body-scroll lock, ref-counted across every Modal instance. */
let scrollLockCount = 0
let savedOverflow = ''
function lockScroll(): void {
  if (scrollLockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLockCount += 1
}
function unlockScroll(): void {
  if (scrollLockCount === 0) return
  scrollLockCount -= 1
  if (scrollLockCount === 0) document.body.style.overflow = savedOverflow
}

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(): HTMLElement[] {
  if (!dialogRef.value) return []
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  )
}

async function activate(): Promise<void> {
  previouslyFocused = document.activeElement as HTMLElement | null
  lockScroll()
  locked = true
  await nextTick()
  // Focus the dialog so screen readers announce the title; Tab then steps into the content.
  dialogRef.value?.focus()
}

function deactivate(): void {
  if (locked) {
    unlockScroll()
    locked = false
  }
  const target = previouslyFocused
  previouslyFocused = null
  target?.focus?.()
}

function close(): void {
  emit('close')
}

function onBackdrop(): void {
  if (props.backdropClose) emit('close')
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }
  if (e.key !== 'Tab') return

  const els = focusables()
  const dialog = dialogRef.value
  if (!dialog) return
  if (els.length === 0) {
    e.preventDefault()
    dialog.focus()
    return
  }

  const first = els[0]
  const last = els[els.length - 1]
  const active = document.activeElement
  const outside = active === dialog || !dialog.contains(active)

  if (e.shiftKey && (active === first || outside)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || outside)) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  (open) => (open ? activate() : deactivate()),
  { immediate: true },
)

onBeforeUnmount(() => {
  if (locked) {
    unlockScroll()
    locked = false
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ov" @click.self="onBackdrop" @keydown="onKeydown">
      <div
        ref="dialogRef"
        class="dlg"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        tabindex="-1"
      >
        <header class="dlg-head">
          <h2 v-if="title" :id="titleId" class="dlg-title">{{ title }}</h2>
          <button type="button" class="dlg-x" aria-label="Close" @click="close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="dlg-body">
          <slot />
        </div>

        <footer v-if="$slots.actions" class="dlg-actions">
          <slot name="actions" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ov {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(4, 4, 6, 0.7);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: ov-in 0.16s ease;
}
.dlg {
  width: min(460px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 24px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(17, 17, 21, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.9);
  outline: none;
  animation: dlg-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.dlg-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.dlg-title {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #f6f6f7;
}
.dlg-x {
  flex-shrink: 0;
  margin-left: auto;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #9a9aa2;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s, background 0.14s;
}
.dlg-x:hover {
  color: #ededee;
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
}
.dlg-x:focus-visible {
  outline: none;
  border-color: #6e7bf2;
  box-shadow: 0 0 0 3px rgba(110, 123, 242, 0.2);
}
.dlg-body {
  font-size: 13.5px;
  line-height: 1.6;
  color: #9a9aa2;
}
.dlg-actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

@keyframes ov-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes dlg-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ov,
  .dlg {
    animation: none;
  }
}
</style>
