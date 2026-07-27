// Storage keys live here (not in the auth store) so the api client can read them
// without importing the store — that would close an import cycle.
export const ACCESS_KEY = 'ft_access'
export const REFRESH_KEY = 'ft_refresh'
