import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Shuffle } from 'lucide-react'
import RevealOriginalButton from './RevealOriginalButton'
import RevealOriginalOverlay from './RevealOriginalOverlay'

type Props = {
  src: string | null
  variant?: 'card' | 'stage'
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function buildFilter(intensity: number) {
  const hue = Math.round(30 * intensity)
  const sat = 1 + 0.25 * intensity
  const contrast = 1 + 0.15 * intensity
  return `hue-rotate(${hue}deg) saturate(${sat}) contrast(${contrast})`
}

function buildSvgFilter(id: string, intensity: number, seed: number) {
  const t = clamp(intensity, 0, 1)
  const baseFrequency = (0.006 + t * 0.02).toFixed(4)
  const numOctaves = Math.round(1 + t * 4)
  const scale = Math.round(4 + t * 60)
  const hue = Math.round(t * 40)
  const sat = (1 + t * 0.6).toFixed(2)
  const contrast = (1 + t * 0.35).toFixed(2)

  return (
    <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={baseFrequency} numOctaves={numOctaves} seed={seed % 999} result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale} xChannelSelector="R" yChannelSelector="G" />
        <feColorMatrix type="matrix" values={`1 0 0 0 0\n0 ${contrast} 0 0 0\n0 0 ${contrast} 0 0\n0 0 0 1 0`} />
      </filter>
      <style>{`[data-warp="${id}"]{filter:url(#${id}) ${buildFilter(t)} hue-rotate(${hue}deg) saturate(${sat});}`}</style>
    </svg>
  )
}

export default function WarpPane({ src, variant = 'card' }: Props) {
  const [intensity, setIntensity] = useState(1)
  const [seed, setSeed] = useState(0)
  const [tint, setTint] = useState<'none' | 'warm' | 'cool' | 'mono'>('none')
  const [reveal, setReveal] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setSeed((s) => s + 1)
    setReveal(false)
  }, [src])

  const filterId = useMemo(() => `warp-${Math.random().toString(36).slice(2, 8)}`, [])

  const warpStyle = useMemo(() => {
    const t = clamp(intensity, 0, 1)
    const rot = (Math.sin((seed + 1) * 1.7) * 3 + (Math.random() - 0.5) * 2) * t
    const skewX = (Math.sin((seed + 3) * 2.1) * 12 + (Math.random() - 0.5) * 6) * t
    const skewY = (Math.cos((seed + 2) * 1.3) * 10 + (Math.random() - 0.5) * 5) * t
    return {
      transform: `rotate(${rot}deg) skew(${skewX}deg, ${skewY}deg)`,
      borderRadius: `${12 + t * 22}px`,
      boxShadow: `0 22px 70px rgba(0,0,0,${0.38 + t * 0.22})`,
    } as React.CSSProperties
  }, [intensity, seed])

  /* ==================== STAGE MODE ==================== */
  if (variant === 'stage') {
    return (
      <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
        {src ? (
          <div className="absolute inset-0 grid place-items-center p-6">
            {buildSvgFilter(filterId, intensity, seed)}
            <div style={warpStyle} className="max-h-full max-w-full" data-warp={filterId}>
              <img
                src={src}
                alt="warp"
                className="max-h-full max-w-full select-none object-contain"
                draggable={false}
                style={{
                  mixBlendMode: 'normal',
                  filter: tint === 'none' ? 'none' : tint === 'warm' ? 'sepia(0.55) saturate(1.25)' : tint === 'cool' ? 'hue-rotate(190deg) saturate(1.05)' : 'grayscale(1) contrast(1.05)',
                }}
              />
            </div>
            <RevealOriginalOverlay src={src} revealed={reveal} />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-sm text-white/40">先上傳圖片</div>
        )}
      </div>
    )
  }

  /* ==================== CARD MODE ==================== */
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">變形扭曲猜謎（整張圖，但變形）</div>
          <div className="text-xs text-white/60">用扭曲/透視讓整張圖不容易一眼看出來。可調整難度強度。</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RevealOriginalButton revealed={reveal} setRevealed={setReveal} disabled={!src} />
          <button type="button" onClick={() => { setIntensity(0.55); setSeed((s) => s + 1) }} disabled={!src} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> 重置</button>
          <button type="button" onClick={() => setSeed((s) => s + 1)} disabled={!src} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"><Shuffle className="h-4 w-4" /> 換一種扭曲</button>
        </div>
      </div>

      <div ref={wrapRef} className="relative h-[58vh] overflow-hidden rounded-xl border border-white/10 bg-black/30">
        {src ? (
          <div className="absolute inset-0 grid place-items-center p-6">
            {buildSvgFilter(filterId, intensity, seed)}
            <div style={warpStyle} className="max-h-full max-w-full" data-warp={filterId}>
              <img src={src} alt="warp" className="max-h-[54vh] max-w-[92vw] select-none" draggable={false} style={{ mixBlendMode: 'normal', filter: tint === 'none' ? 'none' : tint === 'warm' ? 'sepia(0.55) saturate(1.25)' : tint === 'cool' ? 'hue-rotate(190deg) saturate(1.05)' : 'grayscale(1) contrast(1.05)' }} />
            </div>
            <RevealOriginalOverlay src={src} revealed={reveal} />
          </div>
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-white/60">先上傳圖片。</div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold text-white/60">扭曲強度</div>
          <div className="text-[11px] font-mono text-white/70">{Math.round(intensity * 100)}%</div>
        </div>
        <input type="range" min={0} max={100} value={Math.round(intensity * 100)} onChange={(e) => setIntensity(parseInt(e.target.value, 10) / 100)} className="w-full" disabled={!src} />
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold text-white/60">色調</div>
          <div className="text-[11px] text-white/55">選擇更自然的顏色</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['none', 'warm', 'cool', 'mono'] as const).map((o) => (
            <button key={o} type="button" onClick={() => setTint(o)} className={'rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition ' + (tint === o ? 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/30' : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10')} disabled={!src}>
              {o === 'none' ? '原色' : o === 'warm' ? '暖色' : o === 'cool' ? '冷色' : '黑白'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
