import { useMemo } from 'react'
import { PixelateOptions } from '../lib/imagePixelate'

type Props = {
  sourceUrl: string | null
  options: PixelateOptions
  revealSeed: number
}

function buildCssPixelPreviewStyle(opts: PixelateOptions) {
  const size = Math.max(1, Math.round(opts.pixelSize))
  return {
    imageRendering: 'pixelated' as const,
    width: '100%',
    height: '100%',
    transform: `scale(${size})`,
    transformOrigin: 'top left',
    filter: 'contrast(1.02) saturate(1.02)',
  }
}

export default function QuickPreviewPane({ sourceUrl, options, revealSeed }: Props) {
  const size = Math.max(1, Math.round(options.pixelSize))

  const memoKey = useMemo(() => `${size}-${options.grid}-${options.gridAlpha}-${options.gridColor}-${revealSeed}`, [
    size,
    options.grid,
    options.gridAlpha,
    options.gridColor,
    revealSeed,
  ])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">快速預覽（CSS）</div>
          <div className="text-xs text-white/60">
            用來快速看「像素大小/格線」是否合適；不影響下載品質。
          </div>
        </div>
        <div className="text-xs font-mono text-white/60">{sourceUrl ? 'Live' : '—'}</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
        {sourceUrl ? (
          <div className="relative" key={memoKey}>
            <div
              className="relative"
              style={{
                width: `${Math.max(1, Math.floor(100 / size))}%`,
              }}
            >
              <img src={sourceUrl} alt="preview" style={buildCssPixelPreviewStyle(options)} draggable={false} />
            </div>

            {options.grid ? (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(to right, ${options.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${options.gridColor} 1px, transparent 1px)`,
                  backgroundSize: `${size}px ${size}px`,
                  opacity: Math.max(0, Math.min(1, options.gridAlpha)),
                }}
              />
            ) : null}
          </div>
        ) : (
          <div className="grid min-h-[220px] place-items-center p-6 text-center text-sm text-white/60">
            先上傳一張圖片，就能看到像素化效果。
          </div>
        )}
      </div>
    </div>
  )
}
