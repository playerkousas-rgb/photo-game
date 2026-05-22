import { useEffect, useMemo, useRef } from 'react'
import { PixelateOptions, pixelateToCanvas } from '../lib/imagePixelate'

type Props = {
  sourceUrl: string | null
  options: PixelateOptions
  revealSeed: number
  onSize?: (w: number, h: number) => void
  variant?: 'card' | 'stage'
}

export default function PixelCanvas({ sourceUrl, options, revealSeed, onSize, variant = 'card' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const ready = useMemo(() => Boolean(sourceUrl), [sourceUrl])

  useEffect(() => {
    if (!sourceUrl) return
    const img = new Image()
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.src = sourceUrl
    img.onload = () => {
      imgRef.current = img
      onSize?.(img.naturalWidth, img.naturalHeight)
      const canvas = canvasRef.current
      if (!canvas) return
      pixelateToCanvas(img, canvas, options)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    pixelateToCanvas(img, canvas, options)
  }, [options, revealSeed])

  /* ==================== STAGE MODE (fullscreen, no chrome) ==================== */
  if (variant === 'stage') {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
      </div>
    )
  }

  /* ==================== CARD MODE (default, with chrome) ==================== */
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">像素化結果</div>
          <div className="text-xs text-white/60">可直接下載當作猜謎提示圖</div>
        </div>
        <div className="text-xs font-mono text-white/60">{ready ? 'Ready' : 'No image'}</div>
      </div>

      <div className="grid place-items-center overflow-auto rounded-xl border border-white/10 bg-black/30 p-3">
        <canvas ref={canvasRef} className="max-h-[55vh] max-w-full rounded-lg" />
      </div>
    </div>
  )
}
