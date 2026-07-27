<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { uploadImage, publicUrl, validateImage, deleteUpload } from '@/api/upload'
import { useAuthStore } from '@/stores/auth'
import { useGroupsStore } from '@/stores/groups'
import { usePaginated } from '@/composables/pagination'
import { useI18n } from '@/i18n'
import Avatar from '@/components/Avatar.vue'
import ImageCarousel from '@/components/ImageCarousel.vue'
import type { Page, Post, VoteValue } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const groups = useGroupsStore()
const { t } = useI18n()
const projName = ref('')
const error = ref('')

const has42 = computed(() => !!auth.user?.has42)

const editId = ref('')
const editTitle = ref('')
const editContent = ref('')

const composerOpen = ref(false)
const newTitle = ref('')
const newContent = ref('')
const newFiles = ref<string[]>([])
const uploadPct = ref<number | null>(null)
const creating = ref(false)

function projectId(): string {
  return route.params.projectId as string
}
function projectName(): string {
  return (
    projName.value ||
    groups.projects().find((p) => p.projectId === projectId())?.projectName ||
    projectId()
  )
}
function code(name?: string | null): string {
  return (name ?? '??').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??'
}

const {
  items: posts,
  loading,
  done,
  loadMore,
  reload,
} = usePaginated<Post>((cursor) =>
  api.get<Page<Post>>(
    `${ROUTES.posts.listByProject(projectId())}?limit=7${cursor ? `&cursor=${cursor}` : ''}`,
  ),
)

// Swap a single post in place after vote/edit — reloading the whole feed would reset pagination + scroll.
async function replacePost(id: string) {
  try {
    const fresh = await api.get<Post>(ROUTES.posts.single(id))
    const i = posts.value.findIndex((p) => p.id === id)
    if (i !== -1) posts.value[i] = fresh
  } catch {
    /* ignore */
  }
}

function resetComposer() {
  newTitle.value = ''
  newContent.value = ''
  newFiles.value = []
}
async function closeComposer() {
  // Free an image uploaded to disk but never published (Publish uses resetComposer
  // directly, so a successful post keeps its file).
  const url = newFiles.value[0]
  composerOpen.value = false
  resetComposer()
  if (url) await deleteUpload(url)
}

async function vote(post: Post, value: VoteValue) {
  if (!has42.value) return
  try {
    await api.post(ROUTES.posts.vote(post.id), { vote: value })
    await replacePost(post.id)
  } catch {
    /* ignore */
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const invalid = validateImage(file)
  if (invalid) {
    error.value = invalid
    input.value = ''
    return
  }
  error.value = ''
  uploadPct.value = 0
  try {
    newFiles.value = [await uploadImage(file, false, (p) => (uploadPct.value = p))]
  } catch (err) {
    error.value = (err as { message?: string }).message ?? t('forum.uploadFailed')
  } finally {
    uploadPct.value = null
    input.value = ''
  }
}

async function removeImage() {
  const url = newFiles.value[0]
  newFiles.value = []
  if (url) await deleteUpload(url)
}

async function createPost() {
  if (!newContent.value.trim()) return
  creating.value = true
  try {
    const created = await api.post<{ id: string }>(ROUTES.posts.create(projectId()), {
      title: newTitle.value || undefined,
      content: newContent.value,
      filesUrl: newFiles.value.length ? newFiles.value : undefined,
    })
    resetComposer()
    composerOpen.value = false
    // Prepend the fresh post in place; reload() would blank the list and refetch page 1 — a jarring scroll-to-top on publish.
    const fresh = await api.get<Post>(ROUTES.posts.single(created.id))
    posts.value.unshift(fresh)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? t('forum.publishFailed')
  } finally {
    creating.value = false
  }
}

function startEdit(p: Post) {
  editId.value = p.id
  editTitle.value = p.title ?? ''
  editContent.value = p.content
}
async function saveEdit(p: Post) {
  try {
    await api.patch(ROUTES.posts.edit(projectId(), p.id), {
      title: editTitle.value || undefined,
      content: editContent.value,
    })
    editId.value = ''
    await replacePost(p.id)
  } catch (e) {
    error.value = (e as { message?: string }).message ?? t('forum.updateFailed')
  }
}

// The fixed "new post" button overlapped the footer; fade it out while the
// footer is on screen (it comes back as soon as you scroll up).
const footerVisible = ref(false)
let footerObserver: IntersectionObserver | null = null
onMounted(() => {
  const foot = document.querySelector('.hub-foot')
  if (!foot || !('IntersectionObserver' in window)) return
  footerObserver = new IntersectionObserver(
    ([entry]) => (footerVisible.value = entry.isIntersecting),
  )
  footerObserver.observe(foot)
})
onBeforeUnmount(() => footerObserver?.disconnect())

watch(
  () => route.params.projectId,
  () => {
    projName.value = ''
    api
      .get<{ name: string }>(ROUTES.posts.project(projectId()))
      .then((m) => (projName.value = m.name))
      .catch(() => {})
    reload()
  },
  { immediate: true },
)
</script>

<template>
  <section>
    <div class="proj-head">
      <span class="av av-b sq">{{ code(projectName()) }}</span>
      <div class="proj-meta">
        <h1 class="proj-name">{{ projectName() }}</h1>
        <div class="proj-stats">
          <span class="stat"><b>{{ posts.length }}{{ done ? '' : '+' }}</b> {{ posts.length === 1 ? $t('common.post') : $t('common.posts') }}</span>
        </div>
      </div>
      <span class="proj-cat">{{ $t('forum.project42') }}</span>
    </div>

    <div v-if="!has42" class="readonly">
      <span class="ic"><svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg></span>
      <div class="readonly-main">
        <div class="readonly-t">{{ $t('forum.readonlyPreview') }}</div>
        <div class="readonly-x">{{ $t('forum.readonlyPreviewDesc') }}</div>
      </div>
      <button class="readonly-btn" @click="auth.link42()"><span class="badge42-sq" style="width: 18px; height: 18px">42</span>{{ $t('common.linkYour42') }}</button>
    </div>

    <div v-if="has42 && composerOpen" class="composer-card open">
      <div class="pcard-head" style="justify-content: space-between; margin-bottom: 14px">
        <span style="font-weight: 700; color: var(--text)">{{ $t('forum.newPost') }}</span>
        <button class="c-more" :aria-label="$t('forum.closeComposer')" @click="closeComposer">✕</button>
      </div>
      <input v-model="newTitle" class="field" style="margin-bottom: 10px" :placeholder="$t('forum.postTitle')" :aria-label="$t('forum.postTitle')" />
      <textarea v-model="newContent" rows="4" class="field" :placeholder="$t('forum.composerPlaceholder')" :aria-label="$t('forum.postContent')"></textarea>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px">
        <div style="display: flex; align-items: center; gap: 10px">
          <label class="btn-ghost" style="height: 38px; cursor: pointer">
            <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none" style="margin-right: 6px"><rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.7" /><circle cx="9" cy="10" r="1.8" stroke="currentColor" stroke-width="1.7" /><path d="m4 18 5-4 4 3 3-3 4 3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
            {{ uploadPct !== null ? uploadPct + '%' : newFiles.length ? $t('forum.imageReady') : $t('forum.image') }}
            <input type="file" accept="image/*" hidden :aria-label="$t('forum.attachImage')" @change="onFile" />
          </label>
          <span v-if="newFiles.length" style="display: inline-flex; align-items: center; gap: 6px">
            <img :src="publicUrl(newFiles[0])" alt="" style="width: 34px; height: 34px; object-fit: cover; border-radius: 6px" @error="($event.target as HTMLImageElement).style.display = 'none'" />
            <button type="button" class="txt-btn" :aria-label="$t('common.remove')" @click="removeImage">✕</button>
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px">
          <button class="txt-btn" @click="closeComposer">{{ $t('common.cancel') }}</button>
          <button class="btn-primary" :disabled="creating || !newContent.trim()" @click="createPost">
            {{ creating ? $t('forum.publishing') : $t('forum.publish') }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="err">{{ error }}</p>

    <article v-for="p in posts" :key="p.id" class="card">
      <div class="c-head">
        <RouterLink :to="{ name: 'user', params: { id: p.writer } }" style="display: inline-flex; align-items: center; gap: 9px; text-decoration: none">
          <Avatar class="av av-e" :user-id="p.writer" :name="p.user?.name ?? '??'" :size="24" style="border-radius:7px" />
          <span class="comm">{{ p.user?.name ?? $t('forum.anonymous') }}</span>
        </RouterLink>
        <span class="dot">·</span><span class="time">{{ new Date(p.postedAt).toLocaleDateString() }}</span>
        <button v-if="p.writer === auth.user?.id && editId !== p.id" class="txt-btn" style="margin-left: auto" @click="startEdit(p)">{{ $t('common.edit') }}</button>
      </div>

      <template v-if="editId === p.id">
        <input v-model="editTitle" class="field" style="margin-bottom: 10px" :placeholder="$t('forum.title')" :aria-label="$t('forum.postTitle')" />
        <textarea v-model="editContent" rows="3" class="field" :aria-label="$t('forum.postContent')"></textarea>
        <div style="display: flex; align-items: center; gap: 12px; margin-top: 10px">
          <button class="btn-primary" style="height: 36px" @click="saveEdit(p)">{{ $t('common.save') }}</button>
          <button class="txt-btn" @click="editId = ''">{{ $t('forum.cancel') }}</button>
        </div>
      </template>
      <template v-else>
        <RouterLink :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId ?? projectId() } }" style="text-decoration: none; display: block">
          <h3 v-if="p.title" class="c-title">{{ p.title }}</h3>
          <p class="c-body">{{ p.content }}</p>
        </RouterLink>
        <ImageCarousel v-if="p.filesUrl.length" :images="p.filesUrl.map(publicUrl)" :alt="$t('forum.imageSharedBy', { name: p.user?.name ?? $t('forum.anonymous') })" />
        <div class="c-foot">
          <span class="votepill" :style="!has42 ? 'opacity:.45' : ''">
            <button class="vbtn up" :class="{ on: p.myVote === 'UP' }" :aria-pressed="p.myVote === 'UP'" :aria-label="$t('forum.approve')" @click="vote(p, 'UP')"><svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
            <span class="score" :class="{ up: p.myVote === 'UP', down: p.myVote === 'DOWN' }">{{ p.upvotes - p.downvotes }}</span>
            <button class="vbtn down" :class="{ on: p.myVote === 'DOWN' }" :aria-pressed="p.myVote === 'DOWN'" :aria-label="$t('forum.reject')" @click="vote(p, 'DOWN')"><svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg></button>
          </span>
          <RouterLink :to="{ name: 'post', params: { postId: p.id }, query: { projectId: p.projectId ?? projectId() } }" class="chip">
            <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-4 3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg>
            <span class="n">{{ p._count?.chats ?? 0 }}</span> {{ $t('common.comments') }}
          </RouterLink>
        </div>
      </template>
    </article>

    <p v-if="loading && !posts.length" class="muted center" style="padding: 16px">{{ $t('common.loading') }}</p>
    <p v-else-if="!posts.length" class="muted">{{ $t('forum.noPosts') }}</p>
    <button v-else-if="!done" class="btn-ghost" style="margin: 14px auto 0; display: flex" :disabled="loading" @click="loadMore">{{ loading ? $t('common.loading') : $t('common.loadMore') }}</button>
    <p v-else class="muted center" style="padding: 12px; font-size: 12px">— {{ $t('forum.endOfFeed') }} —</p>

    <button v-if="has42 && !composerOpen" class="fab" :class="{ tucked: footerVisible }" :aria-label="$t('forum.newPost')" @click="composerOpen = true">
      <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
    </button>
  </section>
</template>
