import Pusher from 'pusher-js'
import { API_BASE_URL } from './routes'
import { useAuthStore } from '@/stores/auth'

const KEY = import.meta.env.VITE_PUSHER_KEY as string | undefined
const CLUSTER =
  (import.meta.env.VITE_PUSHER_CLUSTER as string | undefined) ?? 'eu'

export function pusherEnabled(): boolean {
  return !!KEY && !/^x+$/i.test(KEY)
}

let pusher: Pusher | null = null

function client(): Pusher {
  if (!pusher) {
    pusher = new Pusher(KEY as string, {
      cluster: CLUSTER,
      // Read the access token DYNAMICALLY on every channel-authorization POST
      // so realtime keeps working after a token refresh (client.ts tryRefresh
      // -> store.setTokens). Interpolating the token at construction time froze
      // the old token and broke auth once it expired.
      channelAuthorization: {
        transport: 'ajax',
        endpoint: `${API_BASE_URL}/pusher/auth`,
        headersProvider: () => ({
          Authorization: `Bearer ${useAuthStore().accessToken ?? ''}`,
        }),
      },
    })
  }
  return pusher
}

/**
 * Disconnect the Pusher socket and reset the singleton so the next session
 * builds a fresh client. Called from the auth store's clear()/logout() flow to
 * avoid a cross-user realtime leak (a new user reusing the previous user's
 * authenticated socket + stale token).
 */
export function disconnectRealtime(): void {
  pusher?.disconnect()
  pusher = null
}

const EVENTS = ['message-created', 'message-updated', 'message-deleted']

export function subscribeGroup(groupId: string, onChange: () => void): () => void {
  if (!pusherEnabled()) return () => {}
  const name = `private-group-${groupId}`
  const channel = client().subscribe(name)
  EVENTS.forEach((e) => channel.bind(e, onChange))
  return () => {
    EVENTS.forEach((e) => channel.unbind(e, onChange))
    client().unsubscribe(name)
  }
}
