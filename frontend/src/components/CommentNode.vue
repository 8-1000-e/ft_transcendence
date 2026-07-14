<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import { ROUTES } from '@/api/routes'
import { publicUrl } from '@/api/upload'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'
import Avatar from '@/components/Avatar.vue'
import type { Comment, Reply, VoteValue } from '@/types/api'

// A comment and a reply are the same ProjectsChat row; treat every node the
// same and let it recurse into its own children.
type ChatNode = (Comment | Reply) & { _count?: { replies: number } }

const props = withDefaults(
  defineProps<{ node: ChatNode; depth?: number; has42: boolean }>(),
  { depth: 0 },
)
const emit = defineEmits<{ (e: 'error', msg: string): void }>()

const auth = useAuthStore()
const { t } = useI18n()

// Visual indentation stops growing past this depth so deep threads stay
// readable and never run off-screen on mobile. Nesting itself is unbounded —
// like Reddit you can always go deeper; only the left inset caps out.
const MAX_INDENT_DEPTH = 5

// Local reactive copy so votes/edits mutate in place — there is no single-node
// GET endpoint to refetch from, and reloading a whole subtree per vote is wasteful.
const n = reactive<ChatNode>({ ...props.node })

const children = ref<ChatNode[]>([])
const loaded = ref(false)
const open = ref(false)
const collapsed = ref(false)
const replyOpen = ref(false)
const replyDraft = ref('')
const editing = ref(false)
const editDraft = ref('')

const replyCount = computed(() => n._count?.replies ?? 0)
const isMine = computed(() => n.writer === auth.user?.id)
const score = computed(() => n.upvotes - n.downvotes)

function message(e: unknown, fallback: string): string {
  return (e as { message?: string }).message ?? fallback
}
function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return t('forum.now')
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

async function fetchChildren() {
  try {
    children.value = await api.get<ChatNode[]>(ROUTES.replies.listByComment(n.id))
    loaded.value = true
    n._count = { replies: children.value.length }
  } catch (e) {
    emit('error', message(e, t('forum.loadRepliesFailed')))
  }
}

async function toggleReplies() {
  open.value = !open.value
  if (open.value && !loaded.value) await fetchChildren()
}

// Mirror the backend voteChat toggle semantics locally (same vote twice removes
// it; the opposite vote switches) so a vote never refetches the subtree.
async function vote(value: VoteValue) {
  if (!props.has42) return
  const prev = { up: n.upvotes, down: n.downvotes, mine: n.myVote }
  if (n.myVote === value) {
    n.myVote = null
    if (value === 'UP') n.upvotes--
    else n.downvotes--
  } else {
    if (n.myVote === 'UP') n.upvotes--
    else if (n.myVote === 'DOWN') n.downvotes--
    n.myVote = value
    if (value === 'UP') n.upvotes++
    else n.downvotes++
  }
  try {
    await api.post(ROUTES.comments.vote(n.id), { vote: value })
  } catch (e) {
    n.upvotes = prev.up
    n.downvotes = prev.down
    n.myVote = prev.mine
    emit('error', message(e, t('forum.voteFailed')))
  }
}

async function submitReply() {
  const body = replyDraft.value.trim()
  if (!body) return
  try {
    await api.post(ROUTES.replies.create(n.id), { content: body })
    replyDraft.value = ''
    replyOpen.value = false
    // Re-fetch this node's children (oldest-first, so the new reply lands at the
    // bottom) and reveal the subtree.
    await fetchChildren()
    open.value = true
    collapsed.value = false
  } catch (e) {
    emit('error', message(e, t('forum.replyFailed')))
  }
}

function startEdit() {
  editing.value = true
  editDraft.value = n.content
}
async function saveEdit() {
  const content = editDraft.value.trim()
  if (!content) return
  try {
    // Comments and replies edit through the same underlying chat update; keep
    // the intent-matching route (comment at the root, reply below it).
    const route = props.depth === 0 ? ROUTES.comments.edit(n.id) : ROUTES.replies.edit(n.id)
    await api.patch(route, { content })
    n.content = content
    editing.value = false
  } catch (e) {
    emit('error', message(e, t('forum.saveEditFailed')))
  }
}
</script>

<template>
  <div class="tnode" :class="{ reply: depth > 0 }">
    <div class="tvote" :style="!has42 ? 'opacity:.4' : ''">
      <button class="tv up" :class="{ on: n.myVote === 'UP' }" :aria-label="$t('forum.upvote')" @click="vote('UP')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5l7 8H5l7-8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg></button>
      <span class="tscore" :class="{ up: n.myVote === 'UP', down: n.myVote === 'DOWN' }">{{ score }}</span>
      <button class="tv down" :class="{ on: n.myVote === 'DOWN' }" :aria-label="$t('forum.downvote')" @click="vote('DOWN')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 19l-7-8h14l-7 8z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" /></svg></button>
    </div>

    <div class="tmain">
      <div class="tmeta">
        <button class="tcollapse" :aria-label="collapsed ? $t('forum.expandThread') : $t('forum.collapseThread')" @click="collapsed = !collapsed">{{ collapsed ? '[+]' : '[–]' }}</button>
        <RouterLink v-if="n.writer" :to="{ name: 'user', params: { id: n.writer } }" class="tauthor-link">
          <Avatar class="av av-d" :user-id="n.writer" :name="n.user?.name ?? '??'" :size="depth > 0 ? 20 : 22" />
          <span class="tauthor">{{ n.user?.name ?? $t('forum.anonymous') }}</span>
        </RouterLink>
        <span class="tdot">·</span><span class="time">{{ timeAgo(n.postedAt) }}</span>
        <span v-if="collapsed && replyCount" class="tcollapsed">· {{ replyCount }} {{ replyCount === 1 ? $t('forum.reply') : $t('forum.replies') }}</span>
      </div>

      <div v-show="!collapsed">
        <template v-if="editing">
          <input v-model="editDraft" class="field" :aria-label="$t('common.edit')" @keyup.enter="saveEdit" />
          <div class="tactions"><button class="txt-btn" style="color: var(--accent-2)" @click="saveEdit">{{ $t('common.save') }}</button><button class="txt-btn" @click="editing = false">{{ $t('forum.cancel') }}</button></div>
        </template>
        <template v-else>
          <p class="tbody">{{ n.content }}</p>
          <img v-for="f in n.filesUrl" :key="f" :src="publicUrl(f)" class="cmt-img" alt="" />
          <div class="tactions">
            <button v-if="has42" class="txt-btn" @click="replyOpen = !replyOpen">{{ $t('common.reply') }}</button>
            <button v-if="replyCount" class="txt-btn accent" @click="toggleReplies">
              {{ open ? $t('forum.hide') : $t('forum.show') }} {{ replyCount }} {{ replyCount === 1 ? $t('forum.reply') : $t('forum.replies') }}
            </button>
            <button v-if="isMine" class="txt-btn" @click="startEdit">{{ $t('common.edit') }}</button>
          </div>
        </template>

        <div v-if="replyOpen" class="treply-composer">
          <input v-model="replyDraft" class="field" style="height: 38px" :placeholder="$t('forum.replyPlaceholder')" :aria-label="$t('forum.writeReply')" @keyup.enter="submitReply" />
          <button class="btn-primary" style="height: 38px" @click="submitReply">{{ $t('forum.replyBtn') }}</button>
        </div>

        <!-- Recurse. Once loaded the subtree stays mounted (v-show) so each
             node keeps its local vote/edit state when collapsed & reopened. -->
        <div v-if="loaded" v-show="open" class="treplies" :class="{ flush: depth >= MAX_INDENT_DEPTH }">
          <CommentNode
            v-for="child in children"
            :key="child.id"
            :node="child"
            :depth="depth + 1"
            :has42="has42"
            @error="emit('error', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tnode { display: flex; gap: 12px; padding: 14px 0; border-top: 1px solid var(--border); }
.tnode.reply { padding: 12px 0 4px; border-top: none; }
.tvote {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding-top: 2px;
}
.tv {
  width: 26px;
  height: 24px;
  border: none;
  background: none;
  color: var(--text-3);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}
.tv.up:hover, .tv.up.on { color: var(--up); }
.tv.down:hover, .tv.down.on { color: var(--down); }
.tscore {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.tscore.up { color: var(--up); }
.tscore.down { color: var(--down); }
.tmain { flex: 1; min-width: 0; }
.tmeta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.tcollapse {
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--dim);
  line-height: 1;
}
.tcollapse:hover { color: var(--accent-2); }
.tauthor-link { display: inline-flex; align-items: center; gap: 7px; text-decoration: none; }
.tauthor { font-size: 12.5px; font-weight: 600; color: var(--text-2); }
.tauthor-link:hover .tauthor { color: var(--accent-2); }
.tdot { color: var(--dim); }
.tcollapsed { color: var(--dim); font-size: 12px; }
.tbody {
  font-size: 13.5px;
  color: var(--text-2);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}
.cmt-img { max-width: 260px; border-radius: 8px; margin: 8px 0 0; display: block; }
.tactions { display: flex; gap: 14px; margin-top: 7px; }
.txt-btn.accent { color: var(--accent-2); }
.treply-composer { display: flex; gap: 8px; margin-top: 10px; max-width: 520px; }
/* nested replies indented under a thread line; .flush caps the inset on deep threads */
.treplies {
  margin: 6px 0 0 4px;
  padding-left: 16px;
  border-left: 2px solid var(--border);
}
.treplies.flush { margin-left: 0; padding-left: 0; border-left: none; }
</style>
