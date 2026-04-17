import { Download, Grid3X3, RefreshCw } from 'lucide-react'

type Props = {
  pixelSize: number
  setPixelSize: (n: number) => void
  grid: boolean
  setGrid: (v: boolean) => void
  gridAlpha: number
  setGridAlpha: (n: number) => void
  gridColor: string
  setGridColor: (s: string) => void
  background: 'transparent' | 'white'
  setBackground: (v: 'transparent' | 'white') => void
  onRandomReveal: () => void
  onDownload: () => void
  canDownload: boolean
}

export default function Toolbar(props: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">像素化設定</div>
            <div className="text-xs text-white/60">調整方塊大小與格線，做成猜謎用的提示圖</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={props.onRandomReveal}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              title="隨機給一個提示（略微降低像素化）"
            >
              <RefreshCw className="h-4 w-4" /> 來一個提示
            </button>
            <button
              type="button"
              onClick={props.onDownload}
              disabled={!props.canDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              title="下載結果圖片"
            >
              <Download className="h-4 w-4" /> 下載
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-white/80">像素大小</label>
              <div className="text-xs font-mono text-white/70">{props.pixelSize}px</div>
            </div>
            <input
              type="range"
              min={4}
              max={80}
              value={props.pixelSize}
              onChange={(e) => props.setPixelSize(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-[11px] text-white/45">
              <span>清楚</span>
              <span>更難</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-white/80">格線</label>
              <button
                type="button"
                onClick={() => props.setGrid(!props.grid)}
                className={
                  'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
                  (props.grid
                    ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30'
                    : 'bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10')
                }
              >
                <Grid3X3 className="h-4 w-4" /> {props.grid ? '開啟' : '關閉'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold text-white/60">格線透明度</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(props.gridAlpha * 100)}
                  onChange={(e) => props.setGridAlpha(parseInt(e.target.value, 10) / 100)}
                  className="w-full"
                  disabled={!props.grid}
                />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-white/60">格線顏色</div>
                <input
                  type="color"
                  value={props.gridColor}
                  onChange={(e) => props.setGridColor(e.target.value)}
                  className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2"
                  disabled={!props.grid}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-white/80">匯出背景</label>
              <div className="text-[11px] text-white/55">透明背景適合 PNG；白底適合投影片或列印</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'transparent' as const, label: '透明（PNG）' },
                  { key: 'white' as const, label: '白底（JPG/PNG）' },
                ] as const
              ).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => props.setBackground(o.key)}
                  className={
                    'rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition ' +
                    (props.background === o.key
                      ? 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/30'
                      : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10')
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
