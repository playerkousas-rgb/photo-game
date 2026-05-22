import { useEffect, useRef, useState, useCallback } from 'react'
import { Smartphone, Zap, Activity, Unlock, Lock } from 'lucide-react'
import { Sound } from '../lib/sound'

const SHAKE_THRESHOLD = 18 // m/s²
const SHAKE_COOLDOWN = 1500 // ms

function isMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function requestMotionPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    const dm = DeviceMotionEvent as any
    if (typeof dm.requestPermission === 'function') {
      dm.requestPermission().then((res: string) => resolve(res === 'granted')).catch(() => resolve(false))
    } else {
      resolve(true)
    }
  })
}

type Props = {
  onShake: () => void
  disabled?: boolean
  armed?: boolean
}

export default function ShakeDetector({ onShake, disabled, armed }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const [lastShake, setLastShake] = useState(0)
  const [shakeCount, setShakeCount] = useState(0)
  const lastAccel = useRef({ x: 0, y: 0, z: 0 })
  const lastTrigger = useRef(0)
  const [showMobileUI, setShowMobileUI] = useState(false)

  useEffect(() => {
    setShowMobileUI(isMobile())
  }, [])

  const handleMotion = useCallback(
    (e: DeviceMotionEvent) => {
      if (!armed || disabled) return
      const acc = e.accelerationIncludingGravity
      if (!acc) return

      const { x, y, z } = acc
      if (x == null || y == null || z == null) return

      const dx = Math.abs(x - lastAccel.current.x)
      const dy = Math.abs(y - lastAccel.current.y)
      const dz = Math.abs(z - lastAccel.current.z)
      lastAccel.current = { x, y, z }

      const delta = dx + dy + dz
      if (delta > SHAKE_THRESHOLD) {
        const now = Date.now()
        if (now - lastTrigger.current > SHAKE_COOLDOWN) {
          lastTrigger.current = now
          setLastShake(now)
          setShakeCount((c) => c + 1)
          setIsShaking(true)
          Sound.buzzerLock()
          // Vibrate if available
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([50, 30, 80])
          }
          onShake()
          setTimeout(() => setIsShaking(false), 400)
        }
      }
    },
    [armed, disabled, onShake],
  )

  async function enableShake() {
    const ok = await requestMotionPermission()
    setHasPermission(ok)
    if (ok) {
      window.addEventListener('devicemotion', handleMotion)
    }
  }

  useEffect(() => {
    if (hasPermission === true) {
      window.addEventListener('devicemotion', handleMotion)
      return () => window.removeEventListener('devicemotion', handleMotion)
    }
  }, [hasPermission, handleMotion])

  // Desktop fallback: click to simulate shake
  function simulateShake() {
    if (!armed || disabled) return
    Sound.buzzerLock()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 80])
    }
    setIsShaking(true)
    onShake()
    setShakeCount((c) => c + 1)
    setTimeout(() => setIsShaking(false), 400)
  }

  if (!showMobileUI) {
    // Desktop: show a big tap area as fallback
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-300" />
          <span className="text-sm font-semibold text-white">搖一搖 / 點擊搶答</span>
        </div>
        <button
          type="button"
          onClick={simulateShake}
          disabled={!armed || disabled}
          className={`w-full rounded-xl border p-6 text-center transition-all duration-200 active:scale-95 ${
            isShaking
              ? 'border-amber-400/40 bg-amber-500/20 scale-105'
              : armed
                ? 'border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer'
                : 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
          }`}
        >
          <Zap className={`mx-auto mb-2 h-8 w-8 ${isShaking ? 'text-amber-300' : 'text-emerald-300'}`} />
          <div className={`text-lg font-black ${isShaking ? 'text-amber-300' : 'text-white'}`}>
            {isShaking ? '搶到了！' : armed ? '點擊搶答！' : '等待開始'}
          </div>
          {shakeCount > 0 && (
            <div className="mt-1 text-[11px] text-white/50">已成功搶答 {shakeCount} 次</div>
          )}
        </button>
      </div>
    )
  }

  // Mobile UI
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-emerald-300" />
        <span className="text-sm font-semibold text-white">手機搖一搖搶答</span>
      </div>

      {hasPermission === null && (
        <button
          type="button"
          onClick={enableShake}
          className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 active:scale-95"
        >
          <Unlock className="mx-auto mb-1 h-5 w-5" />
          點擊啟用搖一搖權限
        </button>
      )}

      {hasPermission === false && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-center text-xs text-rose-200">
          無法取得運動感測器權限。請使用「點擊搶答」模式，或確認使用 HTTPS 連線。
        </div>
      )}

      {hasPermission === true && (
        <button
          type="button"
          onClick={simulateShake}
          disabled={!armed || disabled}
          className={`relative w-full overflow-hidden rounded-xl border p-8 text-center transition-all duration-200 active:scale-95 ${
            isShaking
              ? 'border-amber-400/40 bg-amber-500/20 scale-105'
              : armed
                ? 'border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer'
                : 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
          }`}
        >
          {/* Shake wave animation */}
          {isShaking && (
            <div className="absolute inset-0 animate-ping rounded-xl border-2 border-amber-400/30" />
          )}
          <Zap className={`relative mx-auto mb-2 h-10 w-10 ${isShaking ? 'text-amber-300' : armed ? 'text-emerald-300' : 'text-white/30'}`} />
          <div className={`relative text-xl font-black ${isShaking ? 'text-amber-300' : 'text-white'}`}>
            {isShaking ? '搶到了！' : armed ? '搖一搖搶答！' : '等待開始'}
          </div>
          {armed && !isShaking && (
            <div className="relative mt-1 text-[11px] text-white/40">用力搖動手機即可搶答</div>
          )}
          {shakeCount > 0 && (
            <div className="relative mt-1 text-[11px] text-white/50">已成功搶答 {shakeCount} 次</div>
          )}
        </button>
      )}
    </div>
  )
}
