import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, MousePointer2, Plus, RotateCcw } from 'lucide-react'

type Props = {
  src: string | null
  grid: boolean
  gridSize: number
  gridAlpha: number
  gridColor: string
}

type Pt = { x: number; y: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function ZoomPane({ src, grid, gridSize, gridAlpha, gridColor }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const lastRef = useRef<Pt | null>(null)

  useEffect(() => {
    // reset view when image changes
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [src])

  const gridStyle = useMemo(() => {
    if (!grid) return null
    const size = Math.max(2, Math.round(gridSize))
    return {
      backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
      opacity: clamp(gridAlpha, 0, 1),
    } as React.CSSProperties
  }, [grid, gridSize, gridAlpha, gridColor])

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

    // keep the point under cursor roughly stable
    const rect = wrapRef.current.getBoundingClientRect()
    const cx = clientX - rect.left - rect.width / 2
    const cy = clientY - rect.top - rect.height / 2
    const scale = nextZoom / zoom
    setPan((p) => ({ x: p.x - cx * (scale - 1), y: p.y - cy * (scale - 1) }))
    setZoom(nextZoom)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">像素化結果檢視（可局部放大）</div>
          <div className="text-xs text-white/60">放大只是為了看細節，不會改變像素大小（難度）。</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPan({ x: 0, y: 0 })}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            title="回到中心"
            disabled={!src}
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
            disabled={!src}
          >
            <RotateCcw className="h-4 w-4" /> 重置
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z / 1.25, 1, 8))}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            title="縮小"
            disabled={!src}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z * 1.25, 1, 8))}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            title="放大"
            disabled={!src}
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
        onWheel={(e) => {
          if (!src) return
          e.preventDefault()
          const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
          zoomAt(factor, e.clientX, e.clientY)
        }}
        style={{ touchAction: 'none', cursor: src ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {src ? (
          <>
            <div
              className="absolute left-1/2 top-1/2"
              style={{ transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <img
                src={src}
                alt="full"
                draggable={false}
                className="max-w-none select-none"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {gridStyle ? <div className="pointer-events-none absolute inset-0" style={gridStyle} /> : null}

            <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-mono text-white/80">
              zoom {zoom.toFixed(2)}x
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-white/60">
            先上傳一張圖片，就能在這裡做局部放大觀察。
          </div>
        )}
      </div>
    </div>
  )
}
