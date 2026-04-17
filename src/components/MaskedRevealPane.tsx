import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw, Shuffle } from 'lucide-react'
import RevealOriginalButton from './RevealOriginalButton'
import RevealOriginalOverlay from './RevealOriginalOverlay'

type Props = {
  src: string | null
}

type Pt = { x: number; y: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function MaskedRevealPane({ src }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null)
  const [lens, setLens] = useState({ w: 120, h: 90 })
  const [lensPos, setLensPos] = useState<Pt>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(4)
  const [reveal, setReveal] = useState(false)
  const [dragging, setDragging] = useState(false)
  const lastRef = useRef<Pt | null>(null)

  useEffect(() => {
    setLensPos({ x: 0, y: 0 })
    setLens({ w: 120, h: 90 })
    setZoom(4)
    setImgNatural(null)
    if (!src) return
    const img = new Image()
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
  }, [src])

  useEffect(() => {
    setReveal(false)
  }, [src])

  const baseScale = useMemo(() => {
    if (!imgNatural || !wrapRef.current) return 1
    const rect = wrapRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return 1
    return Math.min(rect.width / imgNatural.w, rect.height / imgNatural.h)
  }, [imgNatural, src])

  const maskStyle = useMemo(() => {
    const w = lens.w
    const h = lens.h
    return {
      WebkitMaskImage: `radial-gradient(circle at center, black 62%, rgba(0,0,0,0) 70%)`,
      WebkitMaskSize: `${w}px ${h}px`,
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: `calc(50% + ${lensPos.x}px) calc(50% + ${lensPos.y}px)`,
      maskImage: `radial-gradient(circle at center, black 62%, rgba(0,0,0,0) 70%)`,
      maskSize: `${w}px ${h}px`,
      maskRepeat: 'no-repeat',
      maskPosition: `calc(50% + ${lensPos.x}px) calc(50% + ${lensPos.y}px)`,
    } as React.CSSProperties
  }, [lens.w, lens.h, lensPos.x, lensPos.y])

  const imgTransform = useMemo(() => {
    // Move the image so that the lens center shows the corresponding area.
    // If lens moves right (+x), we need to move the image left (-x) so the viewed area follows.
    return {
      transform: `translate(-50%, -50%) translate(${-lensPos.x}px, ${-lensPos.y}px) scale(${zoom})`,
      transformOrigin: 'center',
    } as React.CSSProperties
  }, [lensPos.x, lensPos.y, zoom])

  function startDrag(clientX: number, clientY: number) {
    setDragging(true)
    lastRef.current = { x: clientX, y: clientY }
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragging || !lastRef.current) return
    const dx = clientX - lastRef.current.x
    const dy = clientY - lastRef.current.y
    lastRef.current = { x: clientX, y: clientY }
    setLensPos((p) => ({ x: p.x + dx, y: p.y + dy }))
  }

  function endDrag() {
    setDragging(false)
    lastRef.current = null
  }

  function randomSpot() {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const rx = (Math.random() - 0.5) * (rect.width * 0.6)
    const ry = (Math.random() - 0.5) * (rect.height * 0.6)
    setLensPos({ x: rx, y: ry })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">局部放大猜謎（只露出一小塊）</div>
          <div className="text-xs text-white/60">
            畫面其餘部分會遮住，只顯示一個「放大鏡」區域給小朋友猜。拖曳可移動；按鈕可調整放大倍率。
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RevealOriginalButton revealed={reveal} setRevealed={setReveal} disabled={!src} />
          <button
            type="button"
            onClick={() => {
              setLensPos({ x: 0, y: 0 })
              setZoom(2)
            }}
            disabled={!src}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
            title="重置"
          >
            <RotateCcw className="h-4 w-4" /> 重置
          </button>
          <button
            type="button"
            onClick={randomSpot}
            disabled={!src}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
            title="隨機位置"
          >
            <Shuffle className="h-4 w-4" /> 換一個位置
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z / 1.2, 1, 6))}
            disabled={!src}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
            title="縮小"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z * 1.2, 1, 6))}
            disabled={!src}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-400 disabled:opacity-50"
            title="放大"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative h-[58vh] overflow-hidden rounded-xl border border-white/10 bg-black/30"
        onMouseDown={(e) => {
          if (!src) return
          startDrag(e.clientX, e.clientY)
        }}
        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        style={{ cursor: src ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {src ? (
          <>
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-black/75" />

              <div className="absolute inset-0" style={maskStyle}>
                <div
                  className="absolute left-1/2 top-1/2"
                  style={imgTransform}
                >
                  <img
                    src={src}
                    alt="reveal"
                    draggable={false}
                    className="max-w-none select-none"
                    style={{
                      width: imgNatural ? imgNatural.w * baseScale : undefined,
                      height: imgNatural ? imgNatural.h * baseScale : undefined,
                      objectFit: 'contain',
                    }}
                  />
                </div>
              </div>

              <div
                className="pointer-events-none absolute left-1/2 top-1/2 rounded-full ring-2 ring-white/60"
                style={{
                  width: lens.w,
                  height: lens.h,
                  transform: `translate(-50%, -50%) translate(${lensPos.x}px, ${lensPos.y}px)`,
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
                }}
              />

              <div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-mono text-white/80">
                zoom {zoom.toFixed(2)}x
              </div>
            </div>

            <RevealOriginalOverlay src={src} revealed={reveal} />
          </>
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-white/60">
            先上傳一張圖片，就能開始局部放大猜謎。
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 text-[11px] font-semibold text-white/60">放大鏡寬度</div>
          <input
            type="range"
            min={80}
            max={520}
            value={lens.w}
            onChange={(e) => setLens((s) => ({ ...s, w: parseInt(e.target.value, 10) }))}
            className="w-full"
            disabled={!src}
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 text-[11px] font-semibold text-white/60">放大鏡高度</div>
          <input
            type="range"
            min={60}
            max={420}
            value={lens.h}
            onChange={(e) => setLens((s) => ({ ...s, h: parseInt(e.target.value, 10) }))}
            className="w-full"
            disabled={!src}
          />
        </div>
      </div>
    </div>
  )
}
