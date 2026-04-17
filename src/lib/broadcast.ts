export function getBroadcastChannel(name: string) {
  if (typeof window === 'undefined') return null
  if (!('BroadcastChannel' in window)) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (window as any).BroadcastChannel(name) as BroadcastChannel
  } catch {
    return null
  }
}
