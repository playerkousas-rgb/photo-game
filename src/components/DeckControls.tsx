import { ChevronLeft, ChevronRight, ListOrdered, Shuffle } from 'lucide-react'

type Props = {
  hasDeck: boolean
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onShuffle: () => void
}

export default function DeckControls({ hasDeck, index, total, onPrev, onNext, onShuffle }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">題庫控制</div>
          <div className="text-xs text-white/60">上一張 / 下一張 / 亂數順序</div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
          <ListOrdered className="h-4 w-4" />
          {hasDeck ? `${index + 1} / ${total}` : '—'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasDeck}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> 上一張
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasDeck}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          下一張 <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onShuffle}
          disabled={total <= 1}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          title="保留目前這張在第一張，其餘隨機"
        >
          <Shuffle className="h-4 w-4" /> 亂數順序
        </button>
      </div>
    </div>
  )
}
