import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Shuffle } from 'lucide-react'
import RevealOriginalButton from './RevealOriginalButton'
import RevealOriginalOverlay from './RevealOriginalOverlay'

type Props = {
  src: string | null
  variant?: 'card' | 'stage'
}

type Tile = { key: string; x: number; y: number; sx: number; sy: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function shuffled<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export default function ShuffleTilesPane({ src, variant = 'card' }: Props) {
  const [piece, setPiece] = useState(30)
  const [seed, setSeed] = useState(0)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [fitWidth, setFitWidth] = useState(720)
  const [reveal, setReveal] = useState(false)

  useEffect(() => {
    if (!src) {
      setImgSize(null)
      imgRef.current = null
      return
    }
    const img = new Image()
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => {
      imgRef.current = img
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
  }, [src])

  useEffect(() => {
    setReveal(false)
  }, [src, seed])

  const tiles = useMemo(() => {
    if (!imgSize) return [] as Tile[]
    const w = imgSize.w
    const h = imgSize.h
    const p = clamp(Math.round(piece), 30, 260)
    const cols = Math.max(1, Math.ceil(w / p))
    const rows = Math.max(1, Math.ceil(h / p))
    const list: Tile[] = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        list.push({ key: `${x}-${y}`, x, y, sx: x, sy: y })
      }
    }
    const shuffledSrc = shuffled(list.map((t) => ({ sx: t.sx, sy: t.sy })))
    return list.map((t, i) => ({ ...t, ...shuffledSrc[i]! }))
  }, [imgSize, piece, seed])

  const board = useMemo(() => {
    if (!imgSize) return null
    const w = imgSize.w
    const h = imgSize.h
    const p = clamp(Math.round(piece), 30, 260)
    const cols = Math.max(1, Math.ceil(w / p))
    const rows = Math.max(1, Math.ceil(h / p))
    return { w, h, p, cols, rows }
  }, [imgSize, piece])

  const scale = useMemo(() => {
    if (!board) return 1
    return Math.min(1, fitWidth / board.w)
  }, [board, fitWidth])

  /* ==================== STAGE MODE ==================== */
  if (variant === 'stage') {
    if (!src || !board) {
      return <div className="grid h-full place-items-center text-sm text-white/40">先上傳圖片</div>
    }

    // Calculate scale to fit stage
    const stageScale = Math.min(1, 1) // Let CSS handle it via the container

    return (
      <div className="relative h-full w-full overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          <div className="relative" style={{ width: board.w, height: board.h, transform: `scale(${stageScale})` }}>
            {tiles.map((t) => {
              const left = t.x * board.p
              const top = t.y * board.p
              const bgX = -t.sx * board.p
              const bgY = -t.sy * board.p
              const w = Math.min(board.p, board.w - left)
              const h = Math.min(board.p, board.h - top)
              return (
                <div
                  key={t.key}
                  className="absolute border border-white/10"
                  style={{
                    left, top, width: w, height: h,
                    backgroundImage: `url(${src})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${board.w}px ${board.h}px`,
                    backgroundPosition: `${bgX}px ${bgY}px`,
                  }}
                />
              )
            })}
            <RevealOriginalOverlay src={src} revealed={reveal} />
          </div>
        </div>
      </div>
    )
  }

  /* ==================== CARD MODE ==================== */
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">切割打亂猜謎（拼圖亂序）</div>
          <div className="text-xs text-white/60">把圖切成方塊後打亂位置。方塊越小越難。</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RevealOriginalButton revealed={reveal} setRevealed={setReveal} disabled={!src} />
          <button type="button" onClick={() => setSeed((s) => s + 1)} disabled={!src} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"><Shuffle className="h-4 w-4" /> 重新打亂</button>
          <button type="button" onClick={() => { setPiece(30); setSeed((s) => s + 1) }} disabled={!src} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> 重置</button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        {src && board ? (
          <div className="mx-auto overflow-hidden rounded-lg">
            <div className="relative mx-auto overflow-hidden rounded-lg border border-white/10 bg-black/30" style={{ width: fitWidth, height: 420 }}>
              <div className="absolute left-0 top-0 origin-top-left" style={{ width: board.w, height: board.h, transform: `scale(${scale})` }}>
                {tiles.map((t) => {
                  const left = t.x * board.p
                  const top = t.y * board.p
                  const bgX = -t.sx * board.p
                  const bgY = -t.sy * board.p
                  const w = Math.min(board.p, board.w - left)
                  const h = Math.min(board.p, board.h - top)
                  return (
                    <div key={t.key} className="absolute border border-white/10" style={{ left, top, width: w, height: h, backgroundImage: `url(${src})`, backgroundRepeat: 'no-repeat', backgroundSize: `${board.w}px ${board.h}px`, backgroundPosition: `${bgX}px ${bgY}px` }} />
                  )
                })}
                <RevealOriginalOverlay src={src} revealed={reveal} />
              </div>
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-mono text-white/80">
                {reveal ? 'answer' : `tile ${board.p}px`} · scale {scale.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[360px] place-items-center p-6 text-center text-sm text-white/60">先上傳圖片。</div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between"><div className="text-[11px] font-semibold text-white/60">方塊大小（越小越難）</div><div className="text-[11px] font-mono text-white/70">{Math.round(piece)}px</div></div>
        <input type="range" min={30} max={260} value={Math.round(piece)} onChange={(e) => setPiece(parseInt(e.target.value, 10))} className="w-full" disabled={!src} />
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between"><div className="text-[11px] font-semibold text-white/60">畫布寬度（固定顯示範圍）</div><div className="text-[11px] font-mono text-white/70">{fitWidth}px</div></div>
        <input type="range" min={420} max={1200} value={Math.round(fitWidth)} onChange={(e) => setFitWidth(parseInt(e.target.value, 10))} className="w-full" disabled={!src} />
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-white/45">小技巧：把方塊調大比較像「提示」，調小就會變成高難度猜圖。</div>
    </div>
  )
}
