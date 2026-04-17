export type SessionState = {
  sessionId: string
  index: number
  pixelSize: number
  grid: boolean
  gridAlpha: number
  gridColor: string
  background: 'transparent' | 'white'
  updatedAt: number
}

const STORAGE_PREFIX = 'skwscout:pixel-guess:session:'

function randomId() {
  return Math.random().toString(36).slice(2, 8) + '-' + Math.random().toString(36).slice(2, 8)
}

export function createSessionId() {
  return randomId()
}

export function getSessionIdFromUrl() {
  const u = new URL(window.location.href)
  const s = u.searchParams.get('s')
  return s && s.trim().length ? s.trim() : null
}

export function setSessionIdToUrl(sessionId: string) {
  const u = new URL(window.location.href)
  u.searchParams.set('s', sessionId)
  window.history.replaceState({}, '', u.toString())
}

export function writeSession(state: SessionState) {
  localStorage.setItem(STORAGE_PREFIX + state.sessionId, JSON.stringify(state))
}

export function readSession(sessionId: string): SessionState | null {
  const raw = localStorage.getItem(STORAGE_PREFIX + sessionId)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionState
  } catch {
    return null
  }
}

export function mergeSession(target: SessionState, patch: Partial<SessionState>): SessionState {
  return {
    ...target,
    ...patch,
    sessionId: target.sessionId,
    updatedAt: typeof patch.updatedAt === 'number' ? patch.updatedAt : Date.now(),
  }
}
