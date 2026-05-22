import { useEffect, useState, useRef } from 'react'
import { Sound } from '../lib/sound'

const PIXELS = [
  { x: 20, y: 20, size: 40, color: '#6366f1', delay: 0 },
  { x: 70, y: 10, size: 30, color: '#8b5cf6', delay: 100 },
  { x: 110, y: 30, size: 35, color: '#a855f7', delay: 200 },
  { x: 40, y: 70, size: 25, color: '#ec4899', delay: 150 },
  { x: 90, y: 65, size: 45, color: '#6366f1', delay: 250 },
  { x: 140, y: 60, size: 28, color: '#6366f1', delay: 300 },
  { x: 60, y: 110, size: 32, color: '#8b5cf6', delay: 350 },
  { x: 120, y: 105, size: 38, color: '#a855f7', delay: 400 },
]

export default function IntroAnimation() {
  const [phase, setPhase] = useState<'entering' | 'typing' | 'settling' | 'exiting' | 'done'>('entering')
  const [typedText, setTypedText] = useState('')
  const fullText = 'SKWSCOUT'
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const skip = sessionStorage.getItem('photo-game-intro-shown')
    if (skip) {
      setPhase('done')
      return
    }

    // Phase 1: pixels enter (0-600ms)
    setPhase('entering')

    // Phase 2: typewriter (600-1800ms)
    const t1 = setTimeout(() => {
      setPhase('typing')
      let i = 0
      const typeInterval = setInterval(() => {
        i++
        setTypedText(fullText.slice(0, i))
        if (i >= fullText.length) {
          clearInterval(typeInterval)
          setTimeout(() => setPhase('settling'), 200)
        }
      }, 120)
    }, 600)

    // Phase 3: settle (1800-2800ms)
    const t2 = setTimeout(() => {
      setPhase('exiting')
      sessionStorage.setItem('photo-game-intro-shown', '1')
    }, 2800)

    // Phase 4: done
    const t3 = setTimeout(() => {
      setPhase('done')
    }, 3600)

    // Sound
    setTimeout(() => {
      if (Sound.enabled) {
        // Arpeggio up
        const freqs = [261.63, 329.63, 392.0, 523.25, 659.25]
        freqs.forEach((f, i) => {
          setTimeout(() => Sound.beep(f, 0.12), i * 100)
        })
      }
    }, 400)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  if (phase === 'done') return null

  const opacity = phase === 'exiting' ? 0 : 1
  const scale = phase === 'exiting' ? 1.1 : phase === 'entering' ? 0.8 : 1

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-[#02133e]"
      style={{
        opacity,
        transform: `scale(${scale})`,
        transition: 'opacity 600ms ease-out, transform 600ms ease-out',
        pointerEvents: phase === 'exiting' ? 'none' : 'auto',
      }}
      onClick={() => {
        setPhase('done')
        sessionStorage.setItem('photo-game-intro-shown', '1')
      }}
    >
      <div className="relative flex flex-col items-center">
        {/* Pixel grid animation */}
        <div className="relative mb-6 h-36 w-48">
          {PIXELS.map((p, i) => {
            const visible = phase !== 'entering' || i <= Math.floor(Date.now() / 100) % 10
            return (
              <div
                key={i}
                className="absolute rounded-sm"
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  opacity: phase === 'entering' ? 0 : 0.6,
                  transform: phase === 'entering'
                    ? `translateY(${20 + i * 5}px) scale(0.5)`
                    : phase === 'exiting'
                      ? `translateY(-${10 + i * 2}px) scale(0.8)`
                      : 'translateY(0) scale(1)',
                  transition: `all 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${p.delay}ms`,
                  boxShadow: `0 0 ${p.size / 2}px ${p.color}40`,
                }}
              />
            )
          })}
        </div>

        {/* Typewriter text */}
        <div className="flex items-baseline gap-1">
          <span
            className="text-4xl font-black tracking-widest text-white sm:text-5xl"
            style={{
              opacity: phase === 'entering' ? 0 : 1,
              transition: 'opacity 300ms ease-out',
            }}
          >
            {typedText}
          </span>
          {phase === 'typing' && (
            <span className="inline-block h-8 w-[3px] animate-pulse bg-indigo-400 sm:h-10" />
          )}
        </div>

        {/* Subtitle fade in */}
        <div
          className="mt-3 text-sm tracking-widest text-white/40"
          style={{
            opacity: phase === 'settling' || phase === 'exiting' ? 1 : 0,
            transform: phase === 'settling' || phase === 'exiting' ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 400ms ease-out 200ms',
          }}
        >
          像素化猜謎圖工具
        </div>

        {/* Year badge */}
        <div
          className="mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/30"
          style={{
            opacity: phase === 'settling' || phase === 'exiting' ? 1 : 0,
            transition: 'opacity 400ms ease-out 400ms',
          }}
        >
          COPYRIGHT 2026 SKWSCOUT
        </div>

        {/* Click to skip hint */}
        <div
          className="absolute -bottom-16 text-xs text-white/20"
          style={{
            opacity: phase === 'settling' ? 1 : 0,
            transition: 'opacity 300ms ease-out',
          }}
        >
          點擊任意處跳過
        </div>
      </div>
    </div>
  )
}
