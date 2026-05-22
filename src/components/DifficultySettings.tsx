import { useState } from 'react'
import { Settings, Plus, Trash2, Star } from 'lucide-react'

export type DifficultyRule = {
  maxPixelSize: number // <= this pixel size gets this multiplier
  label: string
  multiplier: number
}

export const DEFAULT_RULES: DifficultyRule[] = [
  { maxPixelSize: 80, label: '入門 (80px)', multiplier: 1 },
  { maxPixelSize: 60, label: '簡單 (60px)', multiplier: 1.5 },
  { maxPixelSize: 40, label: '中等 (40px)', multiplier: 2 },
  { maxPixelSize: 20, label: '困難 (20px)', multiplier: 3 },
  { maxPixelSize: 4, label: '專家 (4px)', multiplier: 5 },
]

export function getMultiplier(pixelSize: number, rules: DifficultyRule[]) {
  const sorted = [...rules].sort((a, b) => b.maxPixelSize - a.maxPixelSize)
  for (const r of sorted) {
    if (pixelSize <= r.maxPixelSize) return r.multiplier
  }
  return 1
}

type Props = {
  rules: DifficultyRule[]
  onChange: (rules: DifficultyRule[]) => void
}

export default function DifficultySettings({ rules, onChange }: Props) {
  const [expanded, setExpanded] = useState(false)

  function updateRule(index: number, patch: Partial<DifficultyRule>) {
    const next = rules.map((r, i) => (i === index ? { ...r, ...patch } : r))
    onChange(next)
  }

  function removeRule(index: number) {
    if (rules.length <= 1) return
    onChange(rules.filter((_, i) => i !== index))
  }

  function addRule() {
    const last = rules[rules.length - 1]
    onChange([
      ...rules,
      {
        maxPixelSize: Math.max(4, (last?.maxPixelSize ?? 80) - 10),
        label: `自訂 (${Math.max(4, (last?.maxPixelSize ?? 80) - 10)}px)`,
        multiplier: 1,
      },
    ])
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-300" />
          <span className="text-sm font-semibold text-white">難度倍率分數</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/80"
        >
          <Settings className="h-3 w-3" />
          {expanded ? '收合' : '設定'}
        </button>
      </div>

      <div className="mt-2 text-[11px] text-white/50">
        當前像素 <b className="text-white">?</b> px 對應倍率，搶答成功時自動計分。
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {rules.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2">
              <input
                type="number"
                value={r.maxPixelSize}
                min={4}
                max={200}
                onChange={(e) => updateRule(i, { maxPixelSize: parseInt(e.target.value) || 4 })}
                className="w-14 rounded bg-white/5 px-2 py-1 text-center text-xs text-white"
              />
              <span className="text-[11px] text-white/40">px</span>
              <input
                type="text"
                value={r.label}
                onChange={(e) => updateRule(i, { label: e.target.value })}
                className="min-w-0 flex-1 rounded bg-white/5 px-2 py-1 text-xs text-white"
              />
              <span className="text-[11px] text-white/40">x</span>
              <input
                type="number"
                step={0.5}
                value={r.multiplier}
                onChange={(e) => updateRule(i, { multiplier: parseFloat(e.target.value) || 1 })}
                className="w-14 rounded bg-white/5 px-2 py-1 text-center text-xs text-amber-300"
              />
              <button
                type="button"
                onClick={() => removeRule(i)}
                disabled={rules.length <= 1}
                className="rounded bg-white/5 p-1 text-white/40 hover:bg-white/10 hover:text-rose-300 disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" /> 新增難度等級
          </button>
        </div>
      )}
    </div>
  )
}
