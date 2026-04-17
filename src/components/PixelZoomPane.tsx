import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, MousePointer2, Plus, RotateCcw } from 'lucide-react'
import { PixelateOptions, pixelateToCanvas } from '../lib/imagePixelate'
import RevealOriginalButton from './RevealOriginalButton'
import RevealOriginalOverlay from './RevealOriginalOverlay'

type Props = {
  sourceUrl: string | null
  options: PixelateOptions
  revealSeed: number
}

type Pt = { x: number; y: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function PixelZoomPane({ sourceUrl, options, revealSeed }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const lastRef = useRef<Pt | null>(null)
  const [reveal, setReveal] = useState(false)

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setReveal(false)
  }, [sourceUrl])

  useEffect(() => {
    if (!sourceUrl) return
    const img = document.createElement('img')
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.src = sourceUrl
    img.onload = () => {
      imgRef.current = img
      if (!canvasRef.current) return
      pixelateToCanvas(img, canvasRef.current, options)
    }
  }, [sourceUrl])

  useEffect(() => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return
    pixelateToCanvas(img, canvas, options)
  }, [options, revealSeed])

  function startDrag(clientX: number, clientY: number) {
    setDragging(true)
    lastRef.current = { x: clientX, y: clientY }
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragging || !lastRef.current) return
    const dx = clientX - lastRef.current.x
    const dy = clientY - lastRef.current.y
    lastRef.current = { x: clientX, y: clientY }
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
  }

  function endDrag() {
    setDragging(false)
    lastRef.current = null
  }

  function zoomAt(factor: number, clientX?: number, clientY?: number) {
    const nextZoom = clamp(zoom * factor, 1, 8)
    if (!wrapRef.current || clientX == null || clientY == null) {
      setZoom(nextZoom)
      return
    }

    const rect = wrapRef.current.getBoundingClientRect()
    const cx = clientX - rect.left - rect.width / 2
    const cy = clientY - rect.top - rect.height / 2
    const scale = nextZoom / zoom
    setPan((p) => ({ x: p.x - cx * (scale - 1), y: p.y - cy * (scale - 1) }))
    setZoom(nextZoom)
  }

  const gridOverlay = useMemo(() => {
    if (!options.grid) return null
    const size = Math.max(2, Math.round(options.pixelSize))
    return {
      backgroundImage: `linear-gradient(to right, ${options.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${options.gridColor} 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
      opacity: clamp(options.gridAlpha, 0, 1),
    } as React.CSSProperties
  }, [options.grid, options.pixelSize, options.gridColor, options.gridAlpha])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">像素化猜謎（可局部放大）</div>
          <div className="text-xs text-white/60">這裡顯示的是「真正像素化後」的畫面，不會露出原圖細節。</div>
        </div>

        <div className="flex items-center gap-2">
          <RevealOriginalButton revealed={reveal} setRevealed={setReveal} disabled={!sourceUrl} />
          <button
            type="button"
            onClick={() => setPan({ x: 0, y: 0 })}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            title="回到中心"
            disabled={!sourceUrl}
          >
            <MousePointer2 className="h-4 w-4" /> 置中
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            title="重置縮放"
            disabled={!sourceUrl}
          >
            <RotateCcw className="h-4 w-4" /> 重置
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z / 1.25, 1, 8))}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            title="縮小"
            disabled={!sourceUrl}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z * 1.25, 1, 8))}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            title="放大"
            disabled={!sourceUrl}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative h-[58vh] overflow-hidden rounded-xl border border-white/10 bg-black/30"
        onMouseDown={(e) => {
          if (!sourceUrl) return
          startDrag(e.clientX, e.clientY)
        }}
        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onWheel={(e) => {
          if (!sourceUrl) return
          e.preventDefault()
          const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
          zoomAt(factor, e.clientX, e.clientY)
        }}
        style={{ touchAction: 'none', cursor: sourceUrl ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {sourceUrl ? (
          <>
            <div
              className="absolute left-1/2 top-1/2"
              style={{ transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <canvas ref={canvasRef} className="max-w-none select-none" />
            </div>
            {gridOverlay ? <div className="pointer-events-none absolute inset-0" style={gridOverlay} /> : null}

            <RevealOriginalOverlay src={sourceUrl} revealed={reveal} />
          </>
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-white/60">
            先上傳一張圖片，就能開始像素化猜謎。
          </div>
        )}
      </div>
    </div>
  )
}
