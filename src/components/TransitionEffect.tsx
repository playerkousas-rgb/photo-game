import { useEffect, useState, useRef } from 'react'

const TILE_COUNT = 64 // 8x8 grid of transition tiles

type Tile = {
  id: number
  delay: number
  x: number
  y: number
}

function generateTiles(): Tile[] {
  const tiles: Tile[] = []
  const cols = 8
  const rows = 8
  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    tiles.push({
      id: i,
      delay: Math.random() * 300 + (row + col) * 15,
      x: (col / cols) * 100,
      y: (row / rows) * 100,
    })
  }
  // Shuffle for dissolve effect
  return tiles.sort(() => Math.random() - 0.5)
}

type Props = {
  active: boolean
  onComplete?: () => void
  label?: string
}

export default function TransitionEffect({ active, onComplete, label }: Props) {
  const [phase, setPhase] = useState<'idle' | 'entering' | 'exiting'>('idle')
  const [tiles] = useState<Tile[]>(() => generateTiles())
  const [displayLabel, setDisplayLabel] = useState(label)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (active && phase === 'idle') {
      setDisplayLabel(label)
      setPhase('entering')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setPhase('exiting')
        timerRef.current = setTimeout(() => {
          setPhase('idle')
          onComplete?.()
        }, 500)
      }, 600)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    if (label) setDisplayLabel(label)
  }, [label])

  if (phase === 'idle') return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[150] overflow-hidden">
      {/* Tile dissolve grid */}
      {tiles.map((tile) => {
        const isEntering = phase === 'entering'
        const enterDelay = tile.delay
        const exitDelay = TILE_COUNT * 4 - tile.delay
        const duration = 400

        return (
          <div
            key={tile.id}
            className="absolute"
            style={{
              left: `${tile.x}%`,
              top: `${tile.y}%`,
              width: `${100 / 8 + 1}%`,
              height: `${100 / 8 + 1}%`,
              backgroundColor: '#02133e',
              opacity: isEntering ? 1 : 0,
              transform: isEntering ? 'scale(1)' : 'scale(0.8)',
              transition: `opacity ${duration}ms ease-out ${isEntering ? enterDelay : exitDelay}ms, transform ${duration}ms ease-out ${isEntering ? enterDelay : exitDelay}ms`,
            }}
          />
        )
      })}

      {/* Center label */}
      <div
        className="absolute inset-0 grid place-items-center"
        style={{
          opacity: phase === 'entering' ? 1 : 0,
          transition: 'opacity 200ms ease-out',
        }}
      >
        {displayLabel && (
          <div className="rounded-2xl border border-white/10 bg-black/60 px-8 py-4 backdrop-blur-md">
            <div className="text-center text-2xl font-black text-white sm:text-3xl">
              {displayLabel}
            </div>
            <div className="mt-1 text-center text-xs text-white/40">
              準備下一題...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
