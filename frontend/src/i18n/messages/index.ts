// Domain-split message dictionaries, merged into one flat map per locale.
// Each area file owns a slice of namespaced keys (e.g. 'home.title') so several
// areas can be edited independently without colliding.
import common from './common'
import shell from './shell'
import home from './home'
import settings from './settings'
import friends from './friends'
import search from './search'
import auth from './auth'
import profile from './profile'
import forum from './forum'
import chat from './chat'
import browse from './browse'
import legal from './legal'

export type Locale = 'en' | 'fr' | 'es'
export type Dict = Record<string, string>
export type AreaMessages = Record<Locale, Dict>

const areas: AreaMessages[] = [
  common,
  shell,
  home,
  settings,
  friends,
  search,
  auth,
  profile,
  forum,
  chat,
  browse,
  legal,
]

export const messages: Record<Locale, Dict> = { en: {}, fr: {}, es: {} }
for (const area of areas) {
  for (const l of ['en', 'fr', 'es'] as Locale[]) {
    Object.assign(messages[l], area[l])
  }
}
