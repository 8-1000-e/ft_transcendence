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
      // Read the token dynamically per auth POST so realtime survives a token refresh.
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

// Reset the socket on logout so the next user can't reuse the previous authed connection.
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
